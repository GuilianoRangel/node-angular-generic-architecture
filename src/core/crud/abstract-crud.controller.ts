import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Type,
  BadRequestException,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AbstractService } from '../base/abstract.service';
import { AbstractEntity } from '../database/entities/abstract.entity';
import { QueryParams } from '../utils/typeorm-query.parser';
import { DeepPartial } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';

import { AbstractValidationPipe } from '../pipes/abstract-validation.pipe';

export interface CrudOptions {
  roles?: {
    create?: string[];
    read?: string[];
    update?: string[];
    delete?: string[];
  };
}

export function AbstractCrudController<
  T extends AbstractEntity,
  TCreateDto,
  TUpdateDto,
>(
  createDto: Type<TCreateDto>,
  updateDto: Type<TUpdateDto>,
  options: CrudOptions = {},
) {
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  class AbstractCrudControllerHost {
    constructor(readonly service: AbstractService<T>) {}

    @Get()
    @ApiOperation({
      summary: 'Listar todos os registros com paginação e filtro',
    })
    @ApiResponse({ status: 200, description: 'Retorna lista paginada.' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({
      name: 'sort',
      required: false,
      type: String,
      description: 'Formato: campo:ASC,campo:DESC',
    })
    @ApiQuery({
      name: 'filter',
      required: false,
      type: Object,
      description: 'Formato: filter[campo][op]=valor',
    })
    async findAll(@Query() query: QueryParams, @Request() req) {
      this.checkRoles('read', req.user);

      if (req.user.tenantId) {
        query.filter = { ...query.filter, tenantId: req.user.tenantId };
      }

      return this.service.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obter um registro por ID' })
    @ApiResponse({ status: 200, description: 'Retorna o registro.' })
    @ApiResponse({ status: 404, description: 'Registro não encontrado.' })
    async findOne(@Param('id') id: string, @Request() req) {
      this.checkRoles('read', req.user);

      // Fetch with tenantId to verify ownership
      const entity = await this.service.findOne(id, {
        select: ['id', 'tenantId'],
      });

      if (req.user.tenantId && entity.tenantId !== req.user.tenantId) {
        throw new ForbiddenException('Access denied');
      }

      // Return full entity (re-fetch or assume findOne options handled it if we wanted full)
      // Since we only selected id and tenantId above, we should probably re-fetch or
      // better yet, just fetch everything + tenantId if possible.
      // But since tenantId is hidden, we can't easily "unhide" it without selecting everything else manually
      // unless we use addSelect. But AbstractService.findOne uses findOne(options).
      // If we pass select, it ONLY selects those.
      // So we might need to fetch twice: once for check, once for return.
      // Or we just return what we have if the user is happy with it, but likely they want full object.
      // Let's fetch twice for safety and correctness of return value.
      return this.service.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Criar um novo registro' })
    @ApiResponse({
      status: 201,
      description: 'O registro foi criado com sucesso.',
    })
    @ApiBody({ type: createDto })
    async create(
      @Body(new AbstractValidationPipe(createDto)) body: TCreateDto,
      @Request() req,
    ) {
      this.checkRoles('create', req.user);
      this.validateRequiredFields(body);

      const entityToCreate = {
        ...body,
        tenantId: req.user.tenantId,
      } as unknown as DeepPartial<T>;
      return this.service.create(entityToCreate);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar um registro' })
    @ApiResponse({
      status: 200,
      description: 'O registro foi atualizado com sucesso.',
    })
    @ApiResponse({ status: 404, description: 'Registro não encontrado.' })
    @ApiBody({ type: updateDto })
    async update(
      @Param('id') id: string,
      @Body(new AbstractValidationPipe(updateDto)) body: TUpdateDto,
      @Request() req,
    ) {
      this.checkRoles('update', req.user);

      // Verify tenant ownership before update
      const entity = await this.service.findOne(id, {
        select: ['id', 'tenantId'],
      });

      if (req.user.tenantId && entity.tenantId !== req.user.tenantId) {
        throw new ForbiddenException('Access denied');
      }

      this.validateRequiredFields(body, true);
      return this.service.update(id, body as unknown as DeepPartial<T>);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Excluir um registro (Soft Delete)' })
    @ApiResponse({
      status: 200,
      description: 'O registro foi excluído com sucesso.',
    })
    @ApiResponse({ status: 404, description: 'Registro não encontrado.' })
    async remove(@Param('id') id: string, @Request() req) {
      this.checkRoles('delete', req.user);

      // Verify tenant ownership before delete
      const entity = await this.service.findOne(id, {
        select: ['id', 'tenantId'],
      });

      if (req.user.tenantId && entity.tenantId !== req.user.tenantId) {
        throw new ForbiddenException('Access denied');
      }

      return this.service.remove(id);
    }

    validateRequiredFields(body: any, isUpdate = false) {
      const repository = this.service.getRepository();
      const metadata = repository.metadata;
      const errors: any[] = [];

      for (const column of metadata.columns) {
        // Skip generated columns (like ID, created/updatedAt), nullable columns, and columns with default values
        if (
          column.isGenerated ||
          column.isNullable ||
          column.default !== undefined ||
          column.isUpdateDate ||
          column.isCreateDate ||
          column.isDeleteDate ||
          column.isVersion
        ) {
          continue;
        }

        // For updates, only validate if the field is present in the body
        if (isUpdate && body[column.propertyName] === undefined) {
          continue;
        }

        const value = body[column.propertyName];
        if (value === undefined || value === null || value === '') {
          errors.push({
            field: column.propertyName,
            message: `O campo '${column.propertyName}' é obrigatório.`,
            validation: 'required',
          });
        }
      }

      if (errors.length > 0) {
        throw new BadRequestException({
          message: errors,
          error: 'Bad Request',
          statusCode: 400,
        });
      }
    }

    checkRoles(action: keyof CrudOptions['roles'], user: any) {
      if (!options.roles || !options.roles[action]) {
        return; // No roles defined for this action, allow all authenticated
      }
      if (!options.roles[action].includes(user.role)) {
        throw new ForbiddenException(
          `You do not have permission to ${action} this resource`,
        );
      }
    }
  }

  return AbstractCrudControllerHost;
}

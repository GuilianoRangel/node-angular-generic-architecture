import { Get, Post, Body, Patch, Param, Delete, Query, Type, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AbstractService } from '../base/abstract.service';
import { AbstractEntity } from '../database/entities/abstract.entity';
import { QueryParams } from '../utils/typeorm-query.parser';
import { DeepPartial } from 'typeorm';

import { AbstractValidationPipe } from '../pipes/abstract-validation.pipe';

export function AbstractCrudController<T extends AbstractEntity, TCreateDto, TUpdateDto>(
    createDto: Type<TCreateDto>,
    updateDto: Type<TUpdateDto>,
) {
    class AbstractCrudControllerHost {
        constructor(readonly service: AbstractService<T>) { }

        @Get()
        @ApiOperation({ summary: 'List all records with pagination and filtering' })
        @ApiResponse({ status: 200, description: 'Return paginated list.' })
        @ApiQuery({ name: 'page', required: false, type: Number })
        @ApiQuery({ name: 'limit', required: false, type: Number })
        @ApiQuery({ name: 'sort', required: false, type: String, description: 'Format: field:ASC,field:DESC' })
        @ApiQuery({ name: 'filter', required: false, type: Object, description: 'Format: filter[field][op]=value' })
        async findAll(@Query() query: QueryParams) {
            return this.service.findAll(query);
        }

        @Get(':id')
        @ApiOperation({ summary: 'Get a record by ID' })
        @ApiResponse({ status: 200, description: 'Return the record.' })
        @ApiResponse({ status: 404, description: 'Record not found.' })
        async findOne(@Param('id') id: string) {
            return this.service.findOne(id);
        }

        @Post()
        @ApiOperation({ summary: 'Create a new record' })
        @ApiResponse({ status: 201, description: 'The record has been successfully created.' })
        @ApiBody({ type: createDto })
        async create(@Body(new AbstractValidationPipe(createDto)) body: TCreateDto) {
            this.validateRequiredFields(body);
            return this.service.create(body as unknown as DeepPartial<T>);
        }

        @Patch(':id')
        @ApiOperation({ summary: 'Update a record' })
        @ApiResponse({ status: 200, description: 'The record has been successfully updated.' })
        @ApiResponse({ status: 404, description: 'Record not found.' })
        @ApiBody({ type: updateDto })
        async update(@Param('id') id: string, @Body(new AbstractValidationPipe(updateDto)) body: TUpdateDto) {
            this.validateRequiredFields(body, true);
            return this.service.update(id, body as unknown as DeepPartial<T>);
        }

        @Delete(':id')
        @ApiOperation({ summary: 'Delete a record (Soft Delete)' })
        @ApiResponse({ status: 200, description: 'The record has been successfully deleted.' })
        @ApiResponse({ status: 404, description: 'Record not found.' })
        async remove(@Param('id') id: string) {
            return this.service.remove(id);
        }

        validateRequiredFields(body: any, isUpdate = false) {
            const repository = this.service.getRepository();
            const metadata = repository.metadata;
            const errors: any[] = [];

            for (const column of metadata.columns) {
                // Skip generated columns (like ID, created/updatedAt), nullable columns, and columns with default values
                if (column.isGenerated || column.isNullable || column.default !== undefined || column.isUpdateDate || column.isCreateDate || column.isDeleteDate || column.isVersion) {
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
                        message: `Field '${column.propertyName}' is required.`,
                        validation: 'required'
                    });
                }
            }

            if (errors.length > 0) {
                throw new BadRequestException({
                    message: errors,
                    error: 'Bad Request',
                    statusCode: 400
                });
            }
        }
    }

    return AbstractCrudControllerHost;
}

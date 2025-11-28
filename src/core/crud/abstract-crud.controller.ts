import { Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AbstractService } from '../base/abstract.service';
import { AbstractEntity } from '../database/entities/abstract.entity';
import { QueryParams } from '../utils/typeorm-query.parser';
import { DeepPartial } from 'typeorm';

export abstract class AbstractCrudController<T extends AbstractEntity, TCreateDto, TUpdateDto> {
    protected constructor(protected readonly service: AbstractService<T>) { }

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
    async create(@Body() createDto: TCreateDto) {
        return this.service.create(createDto as unknown as DeepPartial<T>);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a record' })
    @ApiResponse({ status: 200, description: 'The record has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Record not found.' })
    async update(@Param('id') id: string, @Body() updateDto: TUpdateDto) {
        return this.service.update(id, updateDto as unknown as DeepPartial<T>);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a record (Soft Delete)' })
    @ApiResponse({ status: 200, description: 'The record has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Record not found.' })
    async remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}

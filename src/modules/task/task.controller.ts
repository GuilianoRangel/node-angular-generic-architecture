import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { Task } from './entities/task.entity';
import { TaskService } from './task.service';

import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTaskDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    completed?: boolean;

    @IsOptional()
    @IsUUID()
    categoryId?: string;
}

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    completed?: boolean;

    @IsOptional()
    @IsUUID()
    categoryId?: string;
}

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController extends AbstractCrudController<Task, CreateTaskDto, UpdateTaskDto> {
    constructor(private readonly taskService: TaskService) {
        super(taskService);
    }

    /*     @Post()
        @ApiOperation({ summary: 'Create a new record' })
        @ApiResponse({ status: 201, description: 'The record has been successfully created.' })
        override async create(@Body() createDto: CreateTaskDto) {
            return super.create(createDto);
        }
    
        @Patch(':id')
        @ApiOperation({ summary: 'Update a record' })
        @ApiResponse({ status: 200, description: 'The record has been successfully updated.' })
        @ApiResponse({ status: 404, description: 'Record not found.' })
        override async update(@Param('id') id: string, @Body() updateDto: UpdateTaskDto) {
            return super.update(id, updateDto);
        }*/
} 

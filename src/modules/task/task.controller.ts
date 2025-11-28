import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { Task } from './entities/task.entity';
import { TaskService } from './task.service';

import { IsString, IsOptional, IsBoolean, IsUUID, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
    @ApiProperty({ description: 'The title of the task', minLength: 3, maxLength: 50 })
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    title: string;

    @ApiPropertyOptional({ description: 'The description of the task' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Whether the task is completed', default: false })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value ?? false)
    completed?: boolean;

    @ApiPropertyOptional({ description: 'The UUID of the category', format: 'uuid' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}

export class UpdateTaskDto {
    @ApiPropertyOptional({ description: 'The title of the task', minLength: 3, maxLength: 50 })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    title?: string;

    @ApiPropertyOptional({ description: 'The description of the task' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Whether the task is completed' })
    @IsOptional()
    @IsBoolean()
    completed?: boolean;

    @ApiPropertyOptional({ description: 'The UUID of the category', format: 'uuid' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController extends AbstractCrudController<Task, CreateTaskDto, UpdateTaskDto>(
    CreateTaskDto,
    UpdateTaskDto,
) {
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

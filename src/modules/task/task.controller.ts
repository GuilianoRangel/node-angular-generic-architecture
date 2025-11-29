import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { Task } from './entities/task.entity';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController extends AbstractCrudController<
  Task,
  CreateTaskDto,
  UpdateTaskDto
>(CreateTaskDto, UpdateTaskDto) {
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

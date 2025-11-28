import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractService } from '../../core/base/abstract.service';
import { Task } from './entities/task.entity';

@Injectable()
export class TaskService extends AbstractService<Task> {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
    ) {
        super(taskRepository);
    }

    override async findAll(query: any): Promise<any> {
        // Simple override to include relations for now. 
        // Ideally AbstractService should handle relations via query params.
        const take = query.limit || 10;
        const page = query.page || 1;
        const skip = (page - 1) * take;

        const [data, total] = await this.taskRepository.findAndCount({
            relations: ['category'],
            take,
            skip,
        });

        return {
            data,
            meta: {
                total,
                page: Number(page),
                lastPage: Math.ceil(total / take),
                limit: take
            }
        };
    }
}

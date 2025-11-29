import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractService } from '../../core/base/abstract.service';
import { Task } from './entities/task.entity';
import { TypeOrmQueryParser } from '../../core/utils/typeorm-query.parser';

@Injectable()
export class TaskService extends AbstractService<Task> {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {
    super(taskRepository);
  }

  override async findAll(query: any): Promise<any> {
    const { take, skip, order, where } = TypeOrmQueryParser.parse(query);

    const [data, total] = await this.taskRepository.findAndCount({
      relations: ['category'],
      take,
      skip,
      order,
      where,
    });

    return {
      data,
      meta: {
        total,
        page: Number(query.page || 1),
        lastPage: Math.ceil(total / take),
        limit: take,
      },
    };
  }
}

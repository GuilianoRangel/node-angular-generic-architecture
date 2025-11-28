import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractService } from '../../core/base/abstract.service';
import { Task } from '../task/entities/task.entity';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService extends AbstractService<Category> {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) {
        super(categoryRepository);
    }

    override async remove(id: string): Promise<void> {
        const category = await this.findOne(id);

        // Check if there are any tasks associated with this category
        const taskCount = await this.repository.manager.count(Task, {
            where: { categoryId: id }
        });

        if (taskCount > 0) {
            throw new BadRequestException('Não é possível excluir esta categoria pois existem tarefas associadas a ela.');
        }

        await super.remove(id);
    }
}

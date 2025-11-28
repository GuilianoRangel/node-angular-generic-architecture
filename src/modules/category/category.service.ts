import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractService } from '../../core/base/abstract.service';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService extends AbstractService<Category> {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) {
        super(categoryRepository);
    }
}

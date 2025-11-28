import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { Category } from './entities/category.entity';
import { CategoryService } from './category.service';

export class CreateCategoryDto {
    name: string;
    description?: string;
}

export class UpdateCategoryDto {
    name?: string;
    description?: string;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoryController extends AbstractCrudController<Category, CreateCategoryDto, UpdateCategoryDto> {
    constructor(private readonly categoryService: CategoryService) {
        super(categoryService);
    }
}

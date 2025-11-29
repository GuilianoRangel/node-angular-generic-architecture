import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { Category } from './entities/category.entity';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController extends AbstractCrudController<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
>(CreateCategoryDto, UpdateCategoryDto) {
  constructor(private readonly categoryService: CategoryService) {
    super(categoryService);
  }
}

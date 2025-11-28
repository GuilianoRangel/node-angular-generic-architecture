import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { Category } from './entities/category.entity';
import { CategoryService } from './category.service';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MinLength, MaxLength, IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'The name of the category', minLength: 2, maxLength: 20 })
    @IsString()
    @MinLength(2)
    @MaxLength(20)
    name: string;

    @ApiPropertyOptional({ description: 'The description of the category' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateCategoryDto {
    @ApiPropertyOptional({ description: 'The name of the category', minLength: 2, maxLength: 20 })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(20)
    name?: string;

    @ApiPropertyOptional({ description: 'The description of the category' })
    @IsOptional()
    @IsString()
    description?: string;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoryController extends AbstractCrudController<Category, CreateCategoryDto, UpdateCategoryDto>(
    CreateCategoryDto,
    UpdateCategoryDto,
) {
    constructor(private readonly categoryService: CategoryService) {
        super(categoryService);
    }
}

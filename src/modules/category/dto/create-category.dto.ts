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

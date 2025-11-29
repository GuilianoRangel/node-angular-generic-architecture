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

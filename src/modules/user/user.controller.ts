import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AbstractCrudController } from '../../core/crud/abstract-crud.controller';
import { User } from './entities/user.entity';

import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

class CreateUserDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ required: false, default: 'user' })
    @IsString()
    @IsOptional()
    role?: string;
}

class UpdateUserDto extends PartialType(CreateUserDto) { }

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController extends AbstractCrudController<User, CreateUserDto, UpdateUserDto>(
    CreateUserDto,
    UpdateUserDto,
    {
        roles: {
            create: ['admin'],
            read: ['admin'],
            update: ['admin'],
            delete: ['admin']
        }
    }
) {
    constructor(private readonly userService: UserService) {
        super(userService);
    }

    @Get('me')
    async getProfile(@Request() req) {
        return this.userService.findByUsername(req.user.username);
    }
}

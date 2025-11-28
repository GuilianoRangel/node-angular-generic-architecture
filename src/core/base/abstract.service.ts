import { Repository, DeepPartial } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AbstractEntity } from '../database/entities/abstract.entity';
import { QueryParams, TypeOrmQueryParser } from '../utils/typeorm-query.parser';

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        lastPage: number;
        limit: number;
    };
}

export abstract class AbstractService<T extends AbstractEntity> {
    protected constructor(protected readonly repository: Repository<T>) { }

    async findAll(query: QueryParams): Promise<PaginatedResult<T>> {
        const { take, skip, order, where } = TypeOrmQueryParser.parse<T>(query);

        const [data, total] = await this.repository.findAndCount({
            where,
            take,
            skip,
            order,
        });

        return {
            data,
            meta: {
                total,
                page: Number(query.page) || 1,
                lastPage: Math.ceil(total / (query.limit || 10)),
                limit: take,
            },
        };
    }

    async findOne(id: string): Promise<T> {
        const options: any = { where: { id } };
        const entity = await this.repository.findOne(options);
        if (!entity) {
            throw new NotFoundException(`Entity with ID ${id} not found.`);
        }
        return entity;
    }

    async create(createDto: DeepPartial<T>): Promise<T> {
        const entity = this.repository.create(createDto);
        return this.repository.save(entity);
    }

    async update(id: string, updateDto: DeepPartial<T>): Promise<T> {
        await this.findOne(id);
        await this.repository.update(id, updateDto as any);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const entity = await this.findOne(id);
        await this.repository.softRemove(entity);
    }
}

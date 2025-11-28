import { FindOptionsWhere, ILike, Equal, MoreThan, LessThan, In, Between } from 'typeorm';

import { IsOptional, IsInt, Min, IsString, IsObject, Allow } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryParams {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsString()
    sort?: string; // Ex: 'createdAt:DESC,name:ASC'

    @IsOptional()
    @IsObject()
    @Allow()
    // @Type(() => Object) // This might be needed if plainToInstance ignores it
    filter?: Record<string, any>; // Ex: { name: 'John', age: { gt: 18 } }

    @IsOptional()
    @IsString()
    search?: string; // Global search (optional)
}

export class TypeOrmQueryParser {
    static parse<T>(query: QueryParams): {
        take: number;
        skip: number;
        order: any;
        where: FindOptionsWhere<T>;
    } {
        const page = query.page ? Number(query.page) : 1;
        const limit = query.limit ? Number(query.limit) : 10;
        const take = limit;
        const skip = (page - 1) * limit;

        const order: any = {};
        if (query.sort) {
            query.sort.split(',').forEach((s) => {
                const [field, dir] = s.split(':');
                if (field && dir) {
                    order[field] = dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
                }
            });
        } else {
            order['createdAt'] = 'DESC';
        }

        const where: any = {};
        if (query.filter) {
            Object.keys(query.filter).forEach((key) => {
                const value = query.filter![key];

                if (typeof value === 'object' && value !== null) {
                    if (value.eq) where[key] = Equal(value.eq);
                    // if (value.neq) where[key] = { $not: Equal(value.neq) }; // Not supported directly in simple object
                    if (value.gt) where[key] = MoreThan(value.gt);
                    if (value.lt) where[key] = LessThan(value.lt);
                    if (value.like) where[key] = ILike(`%${value.like}%`);
                    if (value.in) where[key] = In(value.in.split(','));
                    if (value.between) {
                        const [start, end] = value.between.split(',');
                        where[key] = Between(start, end);
                    }
                } else {
                    where[key] = value;
                }
            });
        }

        return { take, skip, order, where };
    }
}

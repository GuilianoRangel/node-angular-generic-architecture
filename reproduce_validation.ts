import 'reflect-metadata';
import { QueryParams } from './src/core/utils/typeorm-query.parser';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

async function test() {
    const input = {
        page: '1',
        limit: '10',
        filter: {
            title: { eq: 'Test' }
        }
    };

    console.log('Input:', input);

    const object = plainToInstance(QueryParams, input);
    console.log('Transformed (plainToInstance):', object);

    const errors = await validate(object, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
        console.log('Validation Errors:', errors);
    } else {
        console.log('Validation Passed');
    }

    // Check if filter is preserved
    if (object.filter) {
        console.log('SUCCESS: filter is preserved:', object.filter);
    } else {
        console.log('FAILURE: filter is missing');
    }
}

test();

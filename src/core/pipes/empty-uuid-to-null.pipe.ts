import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class EmptyUuidToNullPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (typeof value === 'object' && value !== null) {
            this.transformObject(value);
        }
        return value;
    }

    private transformObject(obj: any) {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (typeof obj[key] === 'string' && obj[key] === '') {
                    // Heuristic: Only convert empty strings to null if the key likely represents an ID (UUID)
                    if (key.endsWith('Id') || key === 'id') {
                        obj[key] = null;
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    this.transformObject(obj[key]);
                }
            }
        }
    }
}

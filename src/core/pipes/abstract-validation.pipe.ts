import {
  ArgumentMetadata,
  Injectable,
  ValidationPipe,
  ValidationPipeOptions,
  Type,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';

@Injectable()
export class AbstractValidationPipe extends ValidationPipe {
  constructor(
    private readonly targetType: Type<any>,
    options: ValidationPipeOptions = { transform: true, whitelist: true },
  ) {
    super({
      ...options,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.map((error) => {
          const constraints = error.constraints;
          const firstConstraintKey = Object.keys(constraints || {})[0];
          return {
            field: error.property,
            message: constraints
              ? constraints[firstConstraintKey]
              : 'Validation failed',
            validation: firstConstraintKey,
          };
        });

        return new BadRequestException({
          message: formattedErrors,
          error: 'Bad Request',
          statusCode: 400,
        });
      },
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    const targetMetadata: ArgumentMetadata = {
      ...metadata,
      metatype: this.targetType,
    };
    return super.transform(value, targetMetadata);
  }
}

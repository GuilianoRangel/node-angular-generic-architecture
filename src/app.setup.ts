import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EmptyUuidToNullPipe } from './core/pipes/empty-uuid-to-null.pipe';

export function setupGlobals(app: INestApplication) {
    app.useGlobalPipes(
        new EmptyUuidToNullPipe(),
        new ValidationPipe({ transform: true, whitelist: true })
    );
    app.enableCors();

    const config = new DocumentBuilder()
        .setTitle('Lab CRUD 2')
        .setDescription('The Lab CRUD 2 API description')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupGlobals } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupGlobals(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

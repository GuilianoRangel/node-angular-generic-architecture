import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupGlobals } from './app.setup';
import { Callback, Context, Handler } from 'aws-lambda';

let cachedServer: Handler;

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn'],
    });
    setupGlobals(app);
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer(event, context, callback);
};

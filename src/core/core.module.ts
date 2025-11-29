import { Module, Global } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { TypeOrmModule } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuditSubscriber } from './database/subscribers/audit.subscriber';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: any) => req.headers['x-request-id'] || uuidv4(),
        setup: (cls, req) => {
          const tenantId = req.headers['x-tenant-id'];
          const userId = req.headers['x-user-id'];
          if (tenantId) cls.set('TENANT_ID', tenantId);
          if (userId) cls.set('USER_ID', userId);
        },
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'pg123',
      database: process.env.DB_DATABASE || 'lab_crud2',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production', // Disable in production
    }),
  ],
  providers: [AuditSubscriber],
  exports: [ClsModule, TypeOrmModule],
})
export class CoreModule {}

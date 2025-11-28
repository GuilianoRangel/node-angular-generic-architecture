import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserService } from './modules/user/user.service';
import { ClsService } from 'nestjs-cls';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userService = app.get(UserService);
    const cls = app.get(ClsService);

    // Run in a CLS context to simulate a request/tenant
    await cls.run(async () => {
        cls.set('TENANT_ID', 'admin_tenant');
        cls.set('USER_ID', 'system_seed');

        const adminUsername = 'admin';
        const existingUser = await userService.findByUsername(adminUsername);

        if (!existingUser) {
            console.log('Creating admin user...');
            await userService.create({
                username: adminUsername,
                password: 'admin123',
                role: 'admin',
            });
            console.log('Admin user created successfully.');
        } else {
            console.log('Admin user already exists.');
        }
    });

    await app.close();
}

bootstrap();

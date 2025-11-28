import {
    EventSubscriber,
    EntitySubscriberInterface,
    InsertEvent,
    UpdateEvent,
    SoftRemoveEvent,
    DataSource,
} from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AbstractEntity } from '../entities/abstract.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<AbstractEntity> {
    constructor(
        @Inject(DataSource) dataSource: DataSource,
        private readonly cls: ClsService,
    ) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return AbstractEntity;
    }

    async beforeInsert(event: InsertEvent<AbstractEntity>) {
        const user = this.cls.get('USER_ID') || 'system';
        const tenant = this.cls.get('TENANT_ID');

        event.entity.createdBy = user;
        event.entity.updatedBy = user;

        if (tenant) {
            event.entity.tenantId = tenant;
        }
    }

    async beforeUpdate(event: UpdateEvent<AbstractEntity>) {
        const user = this.cls.get('USER_ID') || 'system';
        if (event.entity) {
            event.entity.updatedBy = user;
        }
    }

    async beforeSoftRemove(event: SoftRemoveEvent<AbstractEntity>) {
        const user = this.cls.get('USER_ID') || 'system';
        // Note: TypeORM might not update the entity on soft remove automatically for custom fields
        // We rely on the fact that we are modifying the entity instance here.
        if (event.entity) {
            event.entity.deletedBy = user;
        }
    }
}

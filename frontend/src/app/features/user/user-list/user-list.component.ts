import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { GenericCrudComponent } from '../../../shared/components/generic-crud/generic-crud.component';
import { ColumnDefinition } from '../../../shared/models/column-definition';
import { FieldDefinition } from '../../../shared/models/field-definition';

@Component({
    selector: 'app-user-list',
    imports: [CommonModule, GenericCrudComponent],
    templateUrl: './user-list.component.html'
})
export class UserListComponent {
    userService = inject(UserService);

    columns: ColumnDefinition[] = [
        { key: 'id', header: 'ID' },
        { key: 'username', header: 'Username' },
        { key: 'role', header: 'Role' }
    ];

    fields: FieldDefinition[] = [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true }
    ];
}

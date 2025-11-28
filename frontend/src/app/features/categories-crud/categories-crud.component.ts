import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericCrudComponent } from '../../shared/components/generic-crud/generic-crud.component';
import { CategoryService } from '../../core/services/category.service';
import { ColumnDefinition } from '../../shared/models/column-definition';
import { FieldDefinition } from '../../shared/models/field-definition';

@Component({
    selector: 'app-categories-crud',
    imports: [CommonModule, GenericCrudComponent],
    templateUrl: './categories-crud.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesCrudComponent {
    categoryService = inject(CategoryService);

    columns: ColumnDefinition[] = [
        { key: 'name', header: 'Nome', width: '30%' },
        { key: 'description', header: 'Descrição', width: '50%' },
        { key: 'actions', header: 'Ações', type: 'actions', width: '15%' },
    ];

    formFields: FieldDefinition[] = [
        { key: 'name', label: 'Nome', type: 'text', required: true },
        { key: 'description', label: 'Descrição', type: 'text' }
    ];
}

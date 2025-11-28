import { Component, computed, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { CategoryService } from '../../core/services/category.service';
import { GenericCrudComponent } from '../../shared/components/generic-crud/generic-crud.component';
import { ColumnDefinition } from '../../shared/models/column-definition';
import { FieldDefinition } from '../../shared/models/field-definition';

@Component({
    selector: 'app-tasks-crud',
    imports: [CommonModule, GenericCrudComponent],
    templateUrl: './tasks-crud.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksCrudComponent {
    taskService = inject(TaskService);
    private categoryService = inject(CategoryService);

    // Resources needed for the form options
    categoriesResource = this.categoryService.list(signal({ page: 1, limit: 100 }));
    categories = computed(() => this.categoriesResource.value()?.data || []);

    columns: ColumnDefinition[] = [
        { key: 'title', header: 'Título', type: 'text', width: '25%' },
        { key: 'description', header: 'Descrição', type: 'text' },
        { key: 'completed', header: 'Completado', type: 'boolean', width: '10%' },
        { key: 'category.name', header: 'Categoria', type: 'text', width: '15%' },
        { key: 'actions', header: 'Ações', type: 'actions', width: '15%' },
    ];

    formFields = computed<FieldDefinition[]>(() => {
        const categoryOptions = this.categories().map(c => ({ label: c.name, value: c.id }));
        return [
            { key: 'title', label: 'Título', type: 'text', required: true },
            { key: 'description', label: 'Descrição', type: 'text' },
            { key: 'categoryId', label: 'Categoria', type: 'select', options: categoryOptions },
            { key: 'completed', label: 'Completado', type: 'checkbox' },
        ];
    });
}
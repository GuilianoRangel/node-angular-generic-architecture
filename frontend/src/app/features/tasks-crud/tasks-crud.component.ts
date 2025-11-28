import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { CategoryService } from '../../core/services/category.service';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table.component';
import { GenericFormComponent } from '../../shared/components/generic-form/generic-form.component';
import { ColumnDefinition } from '../../shared/models/column-definition';
import { FieldDefinition } from '../../shared/models/field-definition';
import { Task } from '../../core/models/task';
import { Category } from '../../core/models/category';

@Component({
    selector: 'app-tasks-crud',
    imports: [CommonModule, GenericTableComponent, GenericFormComponent],
    templateUrl: './tasks-crud.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksCrudComponent {
    private taskService = inject(TaskService);
    private categoryService = inject(CategoryService);

    query = signal<any>({ page: 1, limit: 10 });

    // Resources
    tasksResource = this.taskService.list(this.query);
    categoriesResource = this.categoryService.list(signal({ page: 1, limit: 100 }));

    // Computed signals for data
    // Computed signals for data
    tasks = computed(() => this.tasksResource.value()?.data || []);
    meta = computed(() => this.tasksResource.value()?.meta);
    categories = computed(() => this.categoriesResource.value()?.data || []);

    onPageChange(page: number) {
        this.query.update(q => ({ ...q, page }));
    }

    showForm = false;
    currentTask: Task | null = null;

    columns: ColumnDefinition[] = [
        { key: 'title', header: 'Título', type: 'text', width: '25%' },
        { key: 'description', header: 'Descrição', type: 'text' },
        { key: 'completed', header: 'Completado', type: 'boolean', width: '10%' },
        { key: 'category.name', header: 'Categoria', type: 'text', width: '15%' },
        { key: 'actions', header: 'Ações', type: 'actions', width: '15%' },
    ];

    // No constructor needed with inject() ) { }

    // No ngOnInit needed for resources as they are lazy/reactive

    formFields = computed<FieldDefinition[]>(() => {
        const categoryOptions = this.categories().map(c => ({ label: c.name, value: c.id }));
        return [
            { key: 'title', label: 'Título', type: 'text', required: true },
            { key: 'description', label: 'Descrição', type: 'text' },
            { key: 'categoryId', label: 'Categoria', type: 'select', options: categoryOptions },
            { key: 'completed', label: 'Completado', type: 'checkbox' },
        ];
    });

    openForm() {
        this.currentTask = null;
        this.showForm = true;
    }

    onEdit(task: Task) {
        this.currentTask = task;
        this.showForm = true;
    }

    closeForm() {
        this.showForm = false;
        this.currentTask = null;
    }

    async onSave(data: any) {
        if (this.currentTask) {
            this.taskService.update(this.currentTask.id, data).subscribe(() => {
                this.tasksResource.reload();
            });
        } else {
            this.taskService.create(data).subscribe(() => {
                this.tasksResource.reload();
            });
        }
        this.closeForm();
    }

    async onDelete(task: Task) {
        this.taskService.delete(task.id).subscribe(() => {
            this.tasksResource.reload();
        });
    }
}

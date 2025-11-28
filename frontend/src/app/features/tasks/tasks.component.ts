import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ErrorDialogComponent } from '../../shared/components/error-dialog/error-dialog.component';
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
    selector: 'app-tasks',
    imports: [CommonModule, GenericTableComponent, GenericFormComponent],
    templateUrl: './tasks.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent {
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
        { key: 'title', header: 'Título', type: 'text', width: '20%' },
        { key: 'description', header: 'Descrição', type: 'text' },
        { key: 'completed', header: 'Completado', type: 'boolean', width: '10%' },
        { key: 'category.name', header: 'Categoria', type: 'text', width: '10%' },
        { key: 'actions', header: 'Ações', type: 'actions', width: '20%' },
    ];

    // No constructor needed with inject() ) { }

    // No ngOnInit needed for resources as they are lazy/reactive

    formFields = computed<FieldDefinition[]>(() => {
        const categoryOptions = this.categories().map(c => ({ label: c.name, value: c.id }));
        return [
            { key: 'title', label: 'Título', type: 'text'/* , required: true */ },
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

    private dialog = inject(Dialog);

    onSave(data: any) {
        const operation = this.currentTask
            ? this.taskService.update(this.currentTask.id, data)
            : this.taskService.create(data);

        operation.subscribe({
            next: () => {
                this.tasksResource.reload();
                this.closeForm();
            },
            error: (err) => {
                if (err.error && Array.isArray(err.error.message)) {
                    const backendErrors = err.error.message;
                    const fields = this.formFields();

                    const mappedErrors = backendErrors.map((e: any) => {
                        const fieldDef = fields.find(f => f.key === e.field);
                        return {
                            label: fieldDef ? fieldDef.label : e.field,
                            message: e.message
                        };
                    });

                    this.dialog.open(ErrorDialogComponent, {
                        data: { errors: mappedErrors }
                    });
                }
            }
        });
    }

    onDelete(task: Task) {
        this.taskService.delete(task.id).subscribe(() => {
            this.tasksResource.reload();
        });
    }
}

import { Component, input, inject, signal, computed, ChangeDetectionStrategy, OnInit, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { GenericFormComponent } from '../generic-form/generic-form.component';
import { GenericFilterComponent } from '../generic-filter/generic-filter.component';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { BaseResourceService } from '../../../core/services/base-resource.service';
import { ColumnDefinition } from '../../../shared/models/column-definition';
import { FieldDefinition } from '../../../shared/models/field-definition';

@Component({
    selector: 'app-generic-crud',
    imports: [CommonModule, GenericTableComponent, GenericFormComponent, GenericFilterComponent],
    templateUrl: './generic-crud.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericCrudComponent<T extends { id: string }> implements OnInit {
    // Inputs
    title = input.required<string>();
    service = input.required<BaseResourceService<T>>();
    columns = input.required<ColumnDefinition[]>();
    fields = input.required<FieldDefinition[]>();

    // Internals
    private dialog = inject(Dialog);
    private injector = inject(EnvironmentInjector);
    query = signal<any>({ page: 1, limit: 10 });

    resource: any; // HttpResourceRef<ApiResponse<T>>

    // Computed signals for data
    // We use a computed that returns empty if resource is not yet initialized
    // However, since we init in ngOnInit, the signal might be read before that?
    // We can use a signal for the resource itself.
    private resourceSignal = signal<any>(null);

    data = computed(() => this.resourceSignal()?.value()?.data || []);
    meta = computed(() => this.resourceSignal()?.value()?.meta);

    showForm = false;
    currentEntity: T | null = null;

    ngOnInit() {
        runInInjectionContext(this.injector, () => {
            const res = this.service().list(this.query);
            this.resource = res;
            this.resourceSignal.set(res);
        });
    }

    onPageChange(page: number) {
        this.query.update(q => ({ ...q, page }));
    }

    onFilterChange(filter: any) {
        this.query.update(q => ({
            ...q,
            page: 1, // Reset to first page on filter
            filter: filter
        }));
    }

    openForm() {
        this.currentEntity = null;
        this.showForm = true;
    }

    onEdit(entity: T) {
        this.currentEntity = entity;
        this.showForm = true;
    }

    closeForm() {
        this.showForm = false;
        this.currentEntity = null;
    }

    onSave(data: any) {
        const operation = this.currentEntity
            ? this.service().update(this.currentEntity.id, data)
            : this.service().create(data);

        operation.subscribe({
            next: () => {
                this.resource.reload();
                this.closeForm();
            },
            error: (err) => {
                if (err.error && Array.isArray(err.error.message)) {
                    const backendErrors = err.error.message;
                    const fields = this.fields();

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

    onDelete(entity: T) {
        this.service().delete(entity.id).subscribe(() => {
            this.resource.reload();
        });
    }
}

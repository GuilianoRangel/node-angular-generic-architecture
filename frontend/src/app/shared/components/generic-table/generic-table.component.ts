import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { ColumnDefinition } from '../../models/column-definition';
import { DialogService } from '../../services/dialog.service';
import { PaginationMeta } from '../../../core/services/base-resource.service';

@Component({
    selector: 'app-generic-table',
    imports: [CdkTableModule, CommonModule],
    templateUrl: './generic-table.component.html',
    styles: [],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericTableComponent<T> {
    data = input.required<T[]>();
    columns = input.required<ColumnDefinition[]>();
    meta = input<PaginationMeta | undefined>(undefined);

    edit = output<T>();
    delete = output<T>();
    pageChange = output<number>();

    dataSource = computed(() => this.data());
    displayedColumns = computed(() => this.columns().map(c => c.key));

    constructor(private dialogService: DialogService) { }

    onEdit(row: T) {
        this.edit.emit(row);
    }

    async onDelete(row: T) {
        const confirmed = await this.dialogService.confirm('Are you sure you want to delete this item?');
        if (confirmed) {
            this.delete.emit(row);
        }
    }

    onPageChange(page: number) {
        this.pageChange.emit(page);
    }

    getPropertyValue(row: any, key: string): any {
        return key.split('.').reduce((o, i) => (o ? o[i] : undefined), row);
    }
}

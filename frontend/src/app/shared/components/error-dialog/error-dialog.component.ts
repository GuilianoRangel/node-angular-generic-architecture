import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface ErrorDialogData {
    errors: { label: string; message: string }[];
}

@Component({
    selector: 'app-error-dialog',
    imports: [CommonModule],
    template: `
        <div class="card border-0 shadow-sm" style="min-width: 400px;">
            <div class="card-header bg-danger text-white">
                <h5 class="card-title mb-0">Erro de Validação</h5>
            </div>
            <div class="card-body">
                <ul class="list-group list-group-flush mb-3">
                    <li *ngFor="let error of data.errors" class="list-group-item text-danger">
                        <strong>{{ error.label }}:</strong> {{ error.message }}
                    </li>
                </ul>
                <div class="d-flex justify-content-end">
                    <button class="btn btn-secondary" (click)="dialogRef.close()">Fechar</button>
                </div>
            </div>
        </div>
    `,
    styles: [],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorDialogComponent {
    constructor(
        public dialogRef: DialogRef<void>,
        @Inject(DIALOG_DATA) public data: ErrorDialogData
    ) { }
}

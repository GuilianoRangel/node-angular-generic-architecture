import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldDefinition } from '../../models/field-definition';

@Component({
    selector: 'app-generic-filter',
    imports: [CommonModule, FormsModule],
    template: `
        <div class="card mb-3 shadow-sm">
            <div class="card-body p-3">
                <div class="row g-2 align-items-center">
                    <div class="col-md-3">
                        <select class="form-select" [(ngModel)]="selectedField" (change)="onFieldChange()">
                            <option [ngValue]="null">Selecione um campo...</option>
                            <option *ngFor="let field of filterableFields()" [ngValue]="field">
                                {{ field.label }}
                            </option>
                        </select>
                    </div>

                    @if (selectedField(); as field) {
                        <!-- Operator Selector: Hidden for select/checkbox, Visible for text -->
                        <div class="col-md-2">
                            <select class="form-select" [(ngModel)]="selectedOperator" [disabled]="isOperatorFixed()">
                                <option value="like">Contém</option>
                                <option value="eq">Igual</option>
                                <option value="gt">Maior que</option>
                                <option value="lt">Menor que</option>
                            </select>
                        </div>

                        <!-- Input Area: Changes based on field type -->
                        <div class="col-md-5">
                            @switch (field.type) {
                                @case ('select') {
                                    <select class="form-select" [(ngModel)]="filterValue">
                                        <option [ngValue]="''">Selecione...</option>
                                        @for (opt of field.options; track opt.value) {
                                            <option [value]="opt.value">{{ opt.label }}</option>
                                        }
                                    </select>
                                }
                                @case ('checkbox') {
                                    <select class="form-select" [(ngModel)]="filterValue">
                                        <option [ngValue]="''">Todos</option>
                                        <option [value]="'true'">Sim</option>
                                        <option [value]="'false'">Não</option>
                                    </select>
                                }
                                @default {
                                    <input type="text" class="form-control" 
                                        [(ngModel)]="filterValue" 
                                        (keyup.enter)="applyFilter()"
                                        placeholder="Valor do filtro...">
                                }
                            }
                        </div>

                        <div class="col-md-2 d-flex gap-2">
                            <button class="btn btn-primary w-100" (click)="applyFilter()">
                                <i class="bi bi-search"></i>
                            </button>
                            <button class="btn btn-outline-secondary" (click)="clearFilter()" title="Limpar">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: [],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericFilterComponent {
    fields = input.required<FieldDefinition[]>();
    filterChange = output<any>();

    filterableFields = this.fields;

    selectedField = signal<FieldDefinition | null>(null);
    selectedOperator = signal<string>('like');
    filterValue = signal<string>('');

    onFieldChange() {
        this.filterValue.set('');
        const field = this.selectedField();

        if (field) {
            if (field.type === 'select' || field.type === 'checkbox') {
                this.selectedOperator.set('eq');
            } else {
                this.selectedOperator.set('like');
            }
        } else {
            this.selectedOperator.set('like');
        }
    }

    isOperatorFixed(): boolean {
        const field = this.selectedField();
        return field?.type === 'select' || field?.type === 'checkbox';
    }

    applyFilter() {
        const field = this.selectedField();
        const value = this.filterValue();
        const op = this.selectedOperator();

        if (field && value !== '' && value !== null && value !== undefined) {
            const filter = {
                [field.key]: { [op]: value }
            };
            this.filterChange.emit(filter);
        }
    }

    clearFilter() {
        this.selectedField.set(null);
        this.filterValue.set('');
        this.filterChange.emit(null);
    }
}

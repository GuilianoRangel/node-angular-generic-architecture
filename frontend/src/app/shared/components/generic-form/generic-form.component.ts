import { Component, input, output, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { FieldDefinition } from '../../models/field-definition';

@Component({
    selector: 'app-generic-form',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './generic-form.component.html',
    styles: [],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericFormComponent implements OnInit, OnChanges {
    fields = input<FieldDefinition[]>([]);
    initialData = input<any>({});
    save = output<any>();
    cancel = output<void>();

    form: FormGroup = new FormGroup({});

    ngOnInit() {
        this.buildForm();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['fields'] || changes['initialData']) {
            this.buildForm();
        }
    }

    private buildForm() {
        const group: any = {};
        this.fields().forEach(field => {
            const data = this.initialData();
            const value = data ? data[field.key] : '';
            const validators = field.required ? [Validators.required] : [];
            group[field.key] = new FormControl(value, validators);
        });
        this.form = new FormGroup(group);
    }

    isInvalid(key: string): boolean {
        const control = this.form.get(key);
        return control ? control.invalid && (control.dirty || control.touched) : false;
    }

    onSubmit() {
        if (this.form.valid) {
            this.save.emit(this.form.value);
        } else {
            this.form.markAllAsTouched();
            const firstInvalidControl = Object.keys(this.form.controls).find(key => this.form.get(key)?.invalid);
            if (firstInvalidControl) {
                const element = document.getElementById(firstInvalidControl);
                element?.focus();
            }
        }
    }

    onCancel() {
        this.cancel.emit();
    }
}

import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-register',
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    registerForm = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

    onSubmit() {
        if (this.registerForm.valid) {
            this.authService.register(this.registerForm.value).subscribe({
                next: () => {
                    alert('Registration successful! Please login.');
                    this.router.navigate(['/login']);
                },
                error: (err) => alert('Registration failed')
            });
        }
    }
}

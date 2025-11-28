import { Routes } from '@angular/router';
import { TasksComponent } from './features/tasks/tasks.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
    { path: 'tasks-crud', loadComponent: () => import('./features/tasks-crud/tasks-crud.component').then(m => m.TasksCrudComponent), canActivate: [authGuard] },
    { path: '', redirectTo: 'tasks', pathMatch: 'full' },
];

import { Routes } from '@angular/router';
import { TasksComponent } from './features/tasks/tasks.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { UserListComponent } from './features/user/user-list/user-list.component';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'users', component: UserListComponent, canActivate: [authGuard, adminGuard] },
    { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
    {
        path: 'tasks-crud',
        loadComponent: () => import('./features/tasks-crud/tasks-crud.component').then(m => m.TasksCrudComponent),
        canActivate: [authGuard]
    },
    {
        path: 'categories-crud',
        loadComponent: () => import('./features/categories-crud/categories-crud.component').then(m => m.CategoriesCrudComponent),
        canActivate: [authGuard]
    },
    { path: '', redirectTo: 'tasks', pathMatch: 'full' },
];

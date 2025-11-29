import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3000/auth'; // TODO: Env var
    currentUser = signal<any>(null);

    constructor(private http: HttpClient, private router: Router) {
        this.loadUser();
    }

    login(credentials: any) {
        return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                localStorage.setItem('token', response.access_token);
                this.loadUser();
                this.router.navigate(['/']);
            })
        );
    }

    logout() {
        this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
            next: () => {
                this.doLogout();
            },
            error: () => {
                // Even if backend fails, we should logout locally
                this.doLogout();
            }
        });
    }

    private doLogout() {
        localStorage.removeItem('token');
        this.currentUser.set(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    private loadUser() {
        const token = this.getToken();
        if (token) {
            try {
                const decoded = jwtDecode(token);
                this.currentUser.set(decoded);
            } catch (e) {
                this.logout();
            }
        }
    }

    isAuthenticated(): boolean {
        return !!this.currentUser();
    }

    register(user: any) {
        return this.http.post(`${this.apiUrl}/register`, user);
    }

    hasRole(role: string): boolean {
        const user = this.currentUser();
        return user && user.role === role;
    }
}

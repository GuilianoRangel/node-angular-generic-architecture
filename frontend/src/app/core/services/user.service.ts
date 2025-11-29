import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseResourceService } from './base-resource.service';

@Injectable({
    providedIn: 'root'
})
export class UserService extends BaseResourceService<any> {
    protected basePath = 'users';

    getProfile(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${this.basePath}/me`);
    }
}

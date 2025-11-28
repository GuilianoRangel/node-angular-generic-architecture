import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// @ts-ignore: httpResource is experimental in Angular 19
import { httpResource, HttpResourceRef } from '@angular/common/http';
import { QueryState, serializeQueryParams } from '../utils/query-serializer';

export interface PaginationMeta {
    total: number;
    page: number;
    lastPage: number;
    limit: number;
}

export interface ApiResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export abstract class BaseResourceService<T> {
    protected abstract basePath: string;
    protected apiUrl = 'http://localhost:3000'; // TODO: Env var
    protected http = inject(HttpClient);

    list(querySignal: Signal<QueryState>): HttpResourceRef<ApiResponse<T> | undefined> {
        // @ts-ignore
        return httpResource<ApiResponse<T>>(() => {
            const query = querySignal();
            const params = serializeQueryParams(query);

            return {
                url: `${this.apiUrl}/${this.basePath}`,
                method: 'GET',
                params: params,
            };
        });
    }

    get(idSignal: Signal<string | null>): HttpResourceRef<T | undefined> {
        // @ts-ignore
        return httpResource<T | undefined>(() => {
            const id = idSignal();
            if (!id) return undefined;

            return {
                url: `${this.apiUrl}/${this.basePath}/${id}`,
                method: 'GET',
            };
        });
    }

    create(data: Partial<T>) {
        return this.http.post<T>(`${this.apiUrl}/${this.basePath}`, data);
    }

    update(id: string, data: Partial<T>) {
        return this.http.patch<T>(`${this.apiUrl}/${this.basePath}/${id}`, data);
    }

    delete(id: string) {
        return this.http.delete<void>(`${this.apiUrl}/${this.basePath}/${id}`);
    }
}

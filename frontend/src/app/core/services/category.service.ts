import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseResourceService } from './base-resource.service';
import { Category } from '../models/category';

@Injectable({
    providedIn: 'root'
})
export class CategoryService extends BaseResourceService<Category> {
    protected basePath = 'categories';
}

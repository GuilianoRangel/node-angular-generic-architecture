import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseResourceService } from './base-resource.service';
import { Task } from '../models/task';

@Injectable({
    providedIn: 'root'
})
export class TaskService extends BaseResourceService<Task> {
    protected basePath = 'tasks';
}

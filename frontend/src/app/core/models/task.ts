import { Category } from './category';

export interface Task {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    categoryId?: string;
    category?: Category;
}

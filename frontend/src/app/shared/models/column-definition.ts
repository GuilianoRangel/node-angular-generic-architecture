export interface ColumnDefinition {
    key: string;
    header: string;
    type?: 'text' | 'number' | 'date' | 'currency' | 'actions' | 'boolean';
    width?: string;
}

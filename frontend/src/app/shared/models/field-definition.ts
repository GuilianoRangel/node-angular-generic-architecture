export interface FieldDefinition {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'email' | 'password' | 'select' | 'checkbox';
    required?: boolean;
    options?: { label: string; value: any }[];
}

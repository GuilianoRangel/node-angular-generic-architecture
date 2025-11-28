export interface QueryState {
    page: number;
    limit: number;
    sort?: string;
    filter?: Record<string, any>;
    search?: string;
}

export function serializeQueryParams(state: QueryState): Record<string, string> {
    const params: Record<string, string> = {};

    params['page'] = state.page.toString();
    params['limit'] = state.limit.toString();

    if (state.sort) {
        params['sort'] = state.sort;
    }

    if (state.search) {
        params['search'] = state.search;
    }

    if (state.filter) {
        Object.entries(state.filter).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') return;

            if (typeof value === 'object') {
                Object.entries(value).forEach(([op, val]) => {
                    if (val !== null && val !== undefined && val !== '') {
                        params[`filter[${key}][${op}]`] = String(val);
                    }
                });
            } else {
                params[`filter[${key}]`] = String(value);
            }
        });
    }

    return params;
}

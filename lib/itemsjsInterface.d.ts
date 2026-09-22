import { MultipleQueriesQuery, MultipleQueriesResponse, Hit } from '@algolia/client-search';

interface SearchClient {
    search: (queries: MultipleQueriesQuery[]) => Readonly<Promise<MultipleQueriesResponse<object>>>;
    searchForFacetValues: () => void;
}
interface ItemsJsOptions {
    aggregations?: object;
    sortings?: object;
    searchableFields: string[];
    native_search_enabled?: boolean;
    query: string;
    per_page?: number;
    page?: number;
}
interface ItemsJsRequest {
    query?: string;
    per_page: number;
    page: number;
    indexName: string;
    filters?: object;
    aggregations?: string[];
    filter?: object;
    sort?: string;
}
interface ItemsJsResponse {
    pagination: {
        per_page: number;
        total: number;
        page: number;
    };
    timings: {
        total: number;
        facets: number;
        search: number;
        sorting: number;
    };
    data: {
        items: Array<Hit<object>>;
        aggregations: object;
    };
}

export { ItemsJsOptions, ItemsJsRequest, ItemsJsResponse, SearchClient };

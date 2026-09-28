import { MultipleQueriesQuery, MultipleQueriesResponse, SearchForFacetValuesResponse, SearchForFacetValuesQueryParams, SearchOptions, Hit } from '@algolia/client-search';

interface SearchClient {
    search: (queries: MultipleQueriesQuery[]) => Readonly<Promise<MultipleQueriesResponse<object>>>;
    searchForFacetValues: (queries: SearchForFacetValuesQuery[]) => Readonly<Promise<SearchForFacetValuesResponse[]>>;
}
interface SearchForFacetValuesQuery {
    indexName: string;
    params: SearchForFacetValuesQueryParams & SearchOptions;
}
interface AdapterOptions {
    geoLocationField?: string;
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
    ids?: Array<string | number>;
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
interface ItemsJsBucket {
    key: string;
    doc_count: number;
    selected: boolean;
}

export { AdapterOptions, ItemsJsBucket, ItemsJsOptions, ItemsJsRequest, ItemsJsResponse, SearchClient, SearchForFacetValuesQuery };

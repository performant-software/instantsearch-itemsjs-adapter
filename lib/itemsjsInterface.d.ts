import { SearchForFacetValuesResponse, SearchResponse, SearchParamsObject, Hit } from '@algolia/client-search';

interface SearchClient {
    search: (queries: SearchRequest[]) => Readonly<Promise<SearchResponses>>;
    searchForFacetValues: (queries: SearchForFacetValuesQuery[]) => Readonly<Promise<SearchForFacetValuesResponse[]>>;
}
interface SearchResponses {
    results: Array<SearchResponse<object>>;
}
interface SearchRequest {
    indexName: string;
    params: SearchParamsObject;
}
interface SearchForFacetValuesQuery {
    indexName: string;
    params: SearchParamsObject & {
        facetName: string;
        facetQuery?: string;
        maxFacetHits?: number;
    };
}
interface AdapterOptions {
    geoLocationField?: string;
}
interface HighlightOptions {
    attributesToHighlight?: ReadonlyArray<string>;
    highlightPreTag?: string;
    highlightPostTag?: string;
    attributesToSnippet?: ReadonlyArray<string>;
    snippetEllipsisText?: string;
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

export { AdapterOptions, HighlightOptions, ItemsJsBucket, ItemsJsOptions, ItemsJsRequest, ItemsJsResponse, SearchClient, SearchForFacetValuesQuery, SearchRequest, SearchResponses };

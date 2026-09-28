import {
  Hit,
  MultipleQueriesQuery,
  MultipleQueriesResponse,
  SearchForFacetValuesQueryParams,
  SearchForFacetValuesResponse,
  SearchOptions,
} from "@algolia/client-search";

export interface SearchClient {
  search: (
    queries: MultipleQueriesQuery[]
  ) => Readonly<Promise<MultipleQueriesResponse<object>>>;
  searchForFacetValues: (
    queries: SearchForFacetValuesQuery[]
  ) => Readonly<Promise<SearchForFacetValuesResponse[]>>;
}

export interface SearchForFacetValuesQuery {
  indexName: string;
  params: SearchForFacetValuesQueryParams & SearchOptions;
}

export interface AdapterOptions {
  // The document field holding each item's location, as { lat, lng } or [lat, lng]
  geoLocationField?: string;
}

export interface ItemsJsOptions {
  aggregations?: object;
  sortings?: object;
  searchableFields: string[];
  native_search_enabled?: boolean;
  query: string;
  per_page?: number;
  page?: number;
}

export interface ItemsJsRequest {
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

export interface ItemsJsResponse {
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

export interface ItemsJsBucket {
  key: string;
  doc_count: number;
  selected: boolean;
}

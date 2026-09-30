import {
  Hit,
  SearchForFacetValuesResponse,
  SearchParamsObject,
  SearchResponse,
} from "@algolia/client-search";

export interface SearchClient {
  search: (queries: SearchRequest[]) => Readonly<Promise<SearchResponses>>;
  searchForFacetValues: (
    queries: SearchForFacetValuesQuery[]
  ) => Readonly<Promise<SearchForFacetValuesResponse[]>>;
}

export interface SearchResponses {
  results: Array<SearchResponse<object>>;
}

export interface SearchRequest {
  indexName: string;
  params: SearchParamsObject;
}

export interface SearchForFacetValuesQuery {
  indexName: string;
  params: SearchParamsObject & {
    facetName: string;
    facetQuery?: string;
    maxFacetHits?: number;
  };
}

export interface AdapterOptions {
  // The document field holding each item's location, as { lat, lng } or [lat, lng]
  geoLocationField?: string;
}

export interface HighlightOptions {
  // Attributes to match the query in; the rest are returned unhighlighted.
  // Defaults to the index's searchableFields, or every attribute when the
  // index wasn't made with createIndex.
  attributesToHighlight?: ReadonlyArray<string>;
  highlightPreTag?: string;
  highlightPostTag?: string;
  // "attribute:wordCount", where wordCount defaults to 10
  attributesToSnippet?: ReadonlyArray<string>;
  // Defaults to "…"
  snippetEllipsisText?: string;
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

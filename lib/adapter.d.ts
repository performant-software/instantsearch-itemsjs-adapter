import { SearchForFacetValuesResponse, SearchParamsObject, SearchResponse } from "@algolia/client-search";
//#region src/itemsjsInterface.d.ts
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
interface IndexOptions {
  collator?: Intl.Collator | false;
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
interface ItemsJsBucket {
  key: string;
  doc_count: number;
  selected: boolean;
}
//#endregion
//#region src/adapter.d.ts
export declare function getSearchClient(newIndex?: any, options?: AdapterOptions): SearchClient;
export declare function createIndex(data: object, options: ItemsJsOptions, indexOptions?: IndexOptions): any;
export declare function performSearch(requests: SearchRequest[], index: any, options?: AdapterOptions): Readonly<Promise<SearchResponses>>;
export declare function performSearchForFacetValues(requests: SearchForFacetValuesQuery[], index: any, options?: AdapterOptions): Readonly<Promise<ItemsJsBucket[][]>>;
export declare function searchForFacetValues(requests: SearchForFacetValuesQuery[], index: any, options?: AdapterOptions): Readonly<Promise<SearchForFacetValuesResponse[]>>;
//#endregion
//# sourceMappingURL=adapter.d.ts.map
import { MultipleQueriesQuery, MultipleQueriesResponse, SearchForFacetValuesResponse } from '@algolia/client-search';
import { SearchClient, ItemsJsOptions, SearchForFacetValuesQuery, ItemsJsBucket } from './itemsjsInterface.js';

declare function getSearchClient(newIndex?: any): SearchClient;
declare function createIndex(data: object, options: ItemsJsOptions): any;
declare function performSearch(requests: MultipleQueriesQuery[], index: any): Readonly<Promise<MultipleQueriesResponse<object>>>;
declare function performSearchForFacetValues(requests: SearchForFacetValuesQuery[], index: any): Readonly<Promise<ItemsJsBucket[][]>>;
declare function searchForFacetValues(requests: SearchForFacetValuesQuery[], index: any): Readonly<Promise<SearchForFacetValuesResponse[]>>;

export { createIndex, getSearchClient, performSearch, performSearchForFacetValues, searchForFacetValues };

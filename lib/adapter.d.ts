import { SearchForFacetValuesResponse } from '@algolia/client-search';
import { ItemsJsOptions, AdapterOptions, SearchClient, SearchRequest, SearchResponses, SearchForFacetValuesQuery, ItemsJsBucket } from './itemsjsInterface.js';

declare function getSearchClient(newIndex?: any, options?: AdapterOptions): SearchClient;
declare function createIndex(data: object, options: ItemsJsOptions): any;
declare function performSearch(requests: SearchRequest[], index: any, options?: AdapterOptions): Readonly<Promise<SearchResponses>>;
declare function performSearchForFacetValues(requests: SearchForFacetValuesQuery[], index: any, options?: AdapterOptions): Readonly<Promise<ItemsJsBucket[][]>>;
declare function searchForFacetValues(requests: SearchForFacetValuesQuery[], index: any, options?: AdapterOptions): Readonly<Promise<SearchForFacetValuesResponse[]>>;

export { createIndex, getSearchClient, performSearch, performSearchForFacetValues, searchForFacetValues };

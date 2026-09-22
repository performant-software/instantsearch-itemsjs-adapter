import { MultipleQueriesQuery, MultipleQueriesResponse } from '@algolia/client-search';
import { SearchClient, ItemsJsOptions } from './itemsjsInterface.js';

declare function getSearchClient(newIndex?: any): SearchClient;
declare function createIndex(data: object, options: ItemsJsOptions): any;
declare function performSearch(requests: MultipleQueriesQuery[], index: any): Readonly<Promise<MultipleQueriesResponse<object>>>;

export { createIndex, getSearchClient, performSearch };

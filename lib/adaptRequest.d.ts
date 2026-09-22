import { MultipleQueriesQuery } from '@algolia/client-search';
import { ItemsJsRequest } from './itemsjsInterface.js';

declare function adaptRequest(request: MultipleQueriesQuery): ItemsJsRequest;
declare function adaptPage(page: number): number;
declare function adaptFilters(instantsearchFacets: any): {};
declare function filterRegex(itemsJsFacets: any, facet: any): any;
declare function parseRange(range: any): any;
declare function adaptNumericFilters(ranges: any): any[];

export { adaptFilters, adaptNumericFilters, adaptPage, adaptRequest, filterRegex, parseRange };

import { SearchResponse, Hit } from '@algolia/client-search';
import { ItemsJsResponse } from './itemsjsInterface.js';

declare function adaptResponse(response: ItemsJsResponse, query: string, processingTimeMS: number): SearchResponse;
declare function adaptHit(item: any): Hit<object>;
declare function adaptFacets(itemsJsFacets: any): Record<string, Record<string, number>>;
declare function adaptFacetsStats(itemsJsFacetsStats: object): Record<string, {
    min: number;
    max: number;
    avg: number;
    sum: number;
}>;

export { adaptFacets, adaptFacetsStats, adaptHit, adaptResponse };

import { SearchResponse, Hit, SearchForFacetValuesResponse } from '@algolia/client-search';
import { ItemsJsResponse, HighlightOptions, ItemsJsBucket, SearchForFacetValuesQuery } from './itemsjsInterface.js';

declare function adaptResponse(response: ItemsJsResponse, query: string, processingTimeMS: number, highlightOptions?: HighlightOptions): SearchResponse;
declare function adaptHit(item: any, query?: string, highlightOptions?: HighlightOptions): Hit<object>;
declare function adaptFacets(itemsJsFacets: any): Record<string, Record<string, number>>;
declare function adaptFacetsStats(itemsJsFacetsStats: object): Record<string, {
    min: number;
    max: number;
    avg: number;
    sum: number;
}>;
declare function adaptHighlightResult(item: object, query?: string, { attributesToHighlight, highlightPostTag, highlightPreTag, }?: HighlightOptions): Record<string, unknown>;
declare function adaptSnippetResult(item: object, query?: string, { attributesToSnippet, highlightPostTag, highlightPreTag, snippetEllipsisText, }?: HighlightOptions): Record<string, unknown>;
declare function adaptFacetHits(buckets: ItemsJsBucket[], params?: Partial<SearchForFacetValuesQuery["params"]>): SearchForFacetValuesResponse;

export { adaptFacetHits, adaptFacets, adaptFacetsStats, adaptHighlightResult, adaptHit, adaptResponse, adaptSnippetResult };

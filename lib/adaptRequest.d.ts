import { MultipleQueriesQuery } from '@algolia/client-search';
import { AdapterOptions, ItemsJsRequest } from './itemsjsInterface.js';

declare function adaptRequest(request: MultipleQueriesQuery, options?: AdapterOptions): ItemsJsRequest;
declare function adaptPage(page: number): number;
declare function adaptFilters(instantsearchFacets: any): {};
declare function filterRegex(itemsJsFacets: any, facet: any): any;
declare function parseRange(range: any): any;
declare function adaptNumericFilters(ranges: any): any[];
declare function wrapLongitude(longitude: number): number;
declare function parseBoundingBox(insideBoundingBox: string | ReadonlyArray<ReadonlyArray<number>>): {
    northEast: {
        lat: number;
        lng: number;
    };
    southWest: {
        lat: number;
        lng: number;
    };
};
declare function getLatLng(value: any): {
    lat: number;
    lng: number;
} | null;
declare function adaptBoundingBox(insideBoundingBox: string | ReadonlyArray<ReadonlyArray<number>>, field: string): (item: any) => boolean;

export { adaptBoundingBox, adaptFilters, adaptNumericFilters, adaptPage, adaptRequest, filterRegex, getLatLng, parseBoundingBox, parseRange, wrapLongitude };

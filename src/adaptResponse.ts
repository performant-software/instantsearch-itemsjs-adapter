//Itemsjs response to Instantsearch response

import {
  Hit,
  SearchForFacetValuesResponse,
  SearchResponse,
} from "@algolia/client-search";
import { ItemsJsBucket, ItemsJsResponse } from "./itemsjsInterface";

export function adaptResponse(
  response: ItemsJsResponse,
  query: string,
  processingTimeMS: number
): SearchResponse {
  const totalNumberOfPages = Math.ceil(
    response.pagination.total / response.pagination.per_page
  );

  return {
    hits: response.data.items.map(adaptHit),
    page: response.pagination.page - 1,
    nbPages: totalNumberOfPages,
    hitsPerPage: response.pagination.per_page,
    nbHits: response.pagination.total,
    processingTimeMS: processingTimeMS,
    exhaustiveNbHits: true,
    query: query,
    params: "",
    facets: adaptFacets(response.data.aggregations),
    facets_stats: adaptFacetsStats(response.data.aggregations),
  };
}

export function adaptHit(item): Hit<object> {
  return {
    objectID: item.id,
    ...item,
    _highlightResult: {}, // Highlighting not supported
  };
}

export function adaptFacets(
  itemsJsFacets
): Record<string, Record<string, number>> {
  const facetNames = Object.keys(itemsJsFacets);

  const instantsearchFacets = {};
  facetNames.forEach((name) => {
    instantsearchFacets[name] = {};

    itemsJsFacets[name].buckets.forEach(({ key, doc_count }) => {
      instantsearchFacets[name][key] = doc_count;
    });
  });

  return instantsearchFacets;
}

export function adaptFacetsStats(
  itemsJsFacetsStats: object
): Record<string, { min: number; max: number; avg: number; sum: number }> {
  const facetNames = Object.keys(itemsJsFacetsStats);
  const instantsearchFacetsStats = {};

  facetNames.forEach((name) => {
    if (itemsJsFacetsStats[name].facet_stats) {
      instantsearchFacetsStats[name] = itemsJsFacetsStats[name].facet_stats;
    }
  });

  return instantsearchFacetsStats;
}

export function adaptFacetHits(
  buckets: ItemsJsBucket[],
  facetQuery = "",
  maxFacetHits = 10
): SearchForFacetValuesResponse {
  const search = facetQuery.toLowerCase();

  const facetHits = buckets
    .filter(
      ({ key, doc_count }) =>
        doc_count > 0 && key.toLowerCase().includes(search)
    )
    .slice(0, maxFacetHits)
    .map(({ key, doc_count }) => ({
      value: key,
      highlighted: key, // Highlighting not supported
      count: doc_count,
    }));

  return {
    facetHits,
    exhaustiveFacetsCount: true,
  };
}

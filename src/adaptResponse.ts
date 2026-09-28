//Itemsjs response to Instantsearch response

import {
  Hit,
  SearchForFacetValuesResponse,
  SearchResponse,
} from "@algolia/client-search";
import {
  ItemsJsBucket,
  ItemsJsResponse,
  SearchForFacetValuesQuery,
} from "./itemsjsInterface";

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

const DEFAULT_MAX_FACET_HITS = 10;
const DEFAULT_HIGHLIGHT_PRE_TAG = "<mark>";
const DEFAULT_HIGHLIGHT_POST_TAG = "</mark>";

const WORD = /[\p{L}\p{N}]+/gu;

const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function getPrefixLength(word: string, prefix: string): number {
  let length = 0;
  let folded = "";

  for (const character of word) {
    if (folded.length >= prefix.length) {
      break;
    }

    folded += fold(character);
    length += character.length;
  }

  return length;
}

export function adaptFacetHits(
  buckets: ItemsJsBucket[],
  params: Partial<SearchForFacetValuesQuery["params"]> = {}
): SearchForFacetValuesResponse {
  const {
    facetQuery = "",
    highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG,
    highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG,
    maxFacetHits = DEFAULT_MAX_FACET_HITS,
  } = params;

  const queryWords = fold(facetQuery).match(WORD) || [];

  const highlight = (value: string) => {
    let highlighted = "";
    let offset = 0;
    const matched = new Set<string>();

    for (const { 0: word, index } of value.matchAll(WORD)) {
      const foldedWord = fold(word);
      const prefixes = queryWords.filter((queryWord) =>
        foldedWord.startsWith(queryWord)
      );

      if (prefixes.length === 0) {
        continue;
      }

      prefixes.forEach((prefix) => matched.add(prefix));

      const longest = prefixes.reduce((a, b) => (b.length > a.length ? b : a));
      const length = getPrefixLength(word, longest);

      highlighted +=
        value.slice(offset, index) +
        highlightPreTag +
        word.slice(0, length) +
        highlightPostTag;
      offset = index + length;
    }

    return queryWords.every((queryWord) => matched.has(queryWord))
      ? highlighted + value.slice(offset)
      : null;
  };

  const facetHits = [];

  // Array.prototype.sort is stable, so values with equal counts keep their order
  const sorted = [...buckets].sort((a, b) => b.doc_count - a.doc_count);

  for (const { key, doc_count } of sorted) {
    if (facetHits.length >= maxFacetHits) {
      break;
    }

    const highlighted = doc_count > 0 ? highlight(key) : null;

    if (highlighted !== null) {
      facetHits.push({ value: key, highlighted, count: doc_count });
    }
  }

  return {
    facetHits,
    exhaustiveFacetsCount: true,
  };
}

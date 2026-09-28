import itemsjs from "itemsjs";
import { adaptFacetHits, adaptResponse } from "./adaptResponse";
import { adaptRequest } from "./adaptRequest";
import {
  MultipleQueriesResponse,
  MultipleQueriesQuery,
  SearchForFacetValuesResponse,
} from "@algolia/client-search";
import {
  ItemsJsBucket,
  ItemsJsOptions,
  SearchClient,
  SearchForFacetValuesQuery,
} from "./itemsjsInterface";

let index;

export function getSearchClient(newIndex?: any): SearchClient {
  return {
    search: (queries: MultipleQueriesQuery[]) =>
      performSearch(queries, index || newIndex),
    searchForFacetValues: (queries: SearchForFacetValuesQuery[]) =>
      performSearchForFacetValuesAdapted(queries, index || newIndex),
  };
}

export function createIndex(data: object, options: ItemsJsOptions): any {
  index = itemsjs(data, options);
  return index;
}

export function performSearch(
  requests: MultipleQueriesQuery[],
  index: any
): Readonly<Promise<MultipleQueriesResponse<object>>> {
  if (index) {
    let processingTimeMS = 0;
    const responses = requests.map((request) => {
      const adaptedRequest = adaptRequest(request);
      const itemsJsRes = index.search(adaptedRequest);

      processingTimeMS = processingTimeMS + itemsJsRes.timings.total;

      // Are there any aggregations?
      if (itemsJsRes.data.aggregations) {
        // Only copy the requested aggregations
        const filteredAggregations = {};
        Object.keys(itemsJsRes.data.aggregations).forEach((aggregationName) => {
          if (request.params.facets.includes(aggregationName)) {
            filteredAggregations[aggregationName] =
              itemsJsRes.data.aggregations[aggregationName];
          }
        });

        itemsJsRes.data.aggregations = filteredAggregations;
      }

      return adaptResponse(itemsJsRes, request.params.query, processingTimeMS);
    });

    return Promise.resolve({ results: responses });
  }

  return null;
}

export function performSearchForFacetValues(
  requests: SearchForFacetValuesQuery[],
  index: any
): Readonly<Promise<ItemsJsBucket[][]>> {
  if (index) {
    const responses = requests.map((request) => {
      const { filter, ...input } = adaptRequest(request);

      // aggregation() JSON-clones its input, which drops the numericFilters
      // function. Resolve query + filter up front and pass the matching ids.
      if (filter) {
        const matches = index.search({
          query: input.query,
          filter,
          page: 1,
          per_page: Number.MAX_SAFE_INTEGER,
        });
        input.ids = matches.data.items.map((item) => item.id);
        delete input.query; // Ignored once ids are set; already applied above
      }

      const itemsJsRes = index.aggregation({
        ...input,
        name: request.params.facetName,
        page: 1,
        per_page: Number.MAX_SAFE_INTEGER,
      });

      return itemsJsRes.data.buckets;
    });

    return Promise.resolve(responses);
  }

  return null;
}

function performSearchForFacetValuesAdapted(
  requests: SearchForFacetValuesQuery[],
  index: any
): Readonly<Promise<SearchForFacetValuesResponse[]>> {
  const results = performSearchForFacetValues(requests, index);

  if (results) {
    return results.then((responses) =>
      responses.map((buckets, i) =>
        adaptFacetHits(
          buckets,
          requests[i].params.facetQuery,
          requests[i].params.maxFacetHits
        )
      )
    );
  }

  return null;
}

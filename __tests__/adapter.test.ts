import products from "./products.json";
import {
  performSearch,
  performSearchForFacetValues,
  createIndex,
  getSearchClient,
} from "../src/adapter";
import {
  MultipleQueriesQuery,
  MultipleQueriesResponse,
} from "@algolia/client-search";
import { ItemsJsOptions } from "../src/itemsjsInterface";

const per_page = 4;
const query = "";
const page = 1;
const totalNumberOfPages: number = Math.ceil(products.length / per_page);

const options: ItemsJsOptions = {
  searchableFields: ["title"],
  query: query,
  aggregations: {
    "category.lvl0": {},
    "category.lvl1": {},
    price: {
      show_facet_stats: true,
    },
  },
};

const requests: MultipleQueriesQuery[] = [
  {
    indexName: "instant_search",
    params: {
      highlightPreTag: "<ais-highlight-0000000000>",
      highlightPostTag: "</ais-highlight-0000000000>",
      query: "",
      maxValuesPerFacet: 10,
      page: 0,
      hitsPerPage: per_page,
      facets: ["category.lvl0"],
      tagFilters: "",
    },
  },
  {
    indexName: "instant_search",
    params: {
      highlightPreTag: "<ais-highlight-0000000000>",
      highlightPostTag: "</ais-highlight-0000000000>",
      query: "",
      maxValuesPerFacet: 10,
      page: 0,
      hitsPerPage: per_page,
      facets: ["price"],
      tagFilters: "",
    },
  },
];

describe("getSearchClient", () => {
  it("getSearchClient", () => {
    const queries: MultipleQueriesQuery[] = [
      {
        indexName: "instant_search",
        params: {
          highlightPreTag: "<ais-highlight-0000000000>",
          highlightPostTag: "</ais-highlight-0000000000>",
          query: "",
          maxValuesPerFacet: 10,
          page: 0,
          hitsPerPage: per_page,
          facets: ["category.lvl0"],
          tagFilters: "",
        },
      },
      {
        indexName: "instant_search",
        params: {
          highlightPreTag: "<ais-highlight-0000000000>",
          highlightPostTag: "</ais-highlight-0000000000>",
          query: "",
          maxValuesPerFacet: 10,
          page: 0,
          hitsPerPage: per_page,
          facets: ["price"],
          tagFilters: "",
        },
      },
    ];

    const index = createIndex(products, options);

    expect(getSearchClient(index).search(queries)).toBeDefined();
    expect(getSearchClient().search(queries)).toBeDefined();
  });

  it("searchForFacetValues returns facet hits matching the facetQuery", async () => {
    const index = createIndex(products, options);

    const [response] = await getSearchClient(index).searchForFacetValues([
      {
        indexName: "instant_search",
        params: { facetName: "category.lvl0", facetQuery: "cloth", query: "" },
      },
    ]);

    expect(response.exhaustiveFacetsCount).toBe(true);
    expect(response.facetHits).toStrictEqual([
      { value: "women's clothing", highlighted: "women's clothing", count: 6 },
      { value: "men's clothing", highlighted: "men's clothing", count: 4 },
    ]);
  });
});

describe("performSearch", () => {
  it("Performs a search", async () => {
    const index = createIndex(products, options);

    const response: Readonly<MultipleQueriesResponse<object>> =
      await performSearch(requests, index);

    expect(response.results[0].hits.length).toBe(per_page || products.length);
    expect(response.results[0].page).toBe(page - 1);
    expect(response.results[0].nbPages).toBe(totalNumberOfPages);
    expect(response.results[0].hitsPerPage).toBe(per_page);
    expect(response.results[0].nbHits).toBe(products.length);
    expect(response.results[0].processingTimeMS).toBeGreaterThanOrEqual(0);
    expect(response.results[0].exhaustiveNbHits).toBe(true);
    expect(response.results[0].query).toBe(query);
    expect(response.results[0].params).toBe("");
    expect(response.results[0].facets).toStrictEqual({
      "category.lvl0": {
        electronics: 6,
        jewelery: 4,
        "men's clothing": 4,
        "women's clothing": 6,
      },
    });
    expect(response.results[0].facets_stats).toStrictEqual({});

    expect(response.results[1].hits.length).toBe(per_page || products.length);
    expect(response.results[1].page).toBe(page - 1);
    expect(response.results[1].nbPages).toBe(totalNumberOfPages);
    expect(response.results[1].hitsPerPage).toBe(per_page);
    expect(response.results[1].nbHits).toBe(products.length);
    expect(response.results[1].processingTimeMS).toBeGreaterThanOrEqual(0);
    expect(response.results[1].exhaustiveNbHits).toBe(true);
    expect(response.results[1].query).toBe(query);
    expect(response.results[1].params).toBe("");
    expect(response.results[1].facets).toStrictEqual({
      price: {
        "109": 2,
        "114": 1,
        "168": 1,
        "10.99": 1,
        "109.95": 1,
        "12.99": 1,
        "15.99": 1,
        "22.3": 1,
        "29.95": 1,
        "39.99": 1,
      },
    });
    expect(response.results[1].facets_stats).toStrictEqual({
      price: { min: 7, max: 999, avg: 161.45, sum: 3229 },
    });
  });

  it("Performs no search, when there is no index", async () => {
    const index = null;

    const response: Readonly<MultipleQueriesResponse<object>> =
      await performSearch(requests, index);

    expect(response).toBeNull();
  });
});

describe("performSearchForFacetValues", () => {
  it("Returns every bucket for the requested facet", async () => {
    const index = createIndex(products, options);

    const response = await performSearchForFacetValues(
      [
        {
          indexName: "instant_search",
          params: { facetName: "price", facetQuery: "", query: "" },
        },
      ],
      index
    );

    expect(response[0].length).toBe(new Set(products.map((p) => p.price)).size);
    expect(response[0].length).toBeGreaterThan(10);
  });

  it("Applies facetFilters", async () => {
    const index = createIndex(products, options);

    const response = await performSearchForFacetValues(
      [
        {
          indexName: "instant_search",
          params: {
            facetName: "category.lvl0",
            facetQuery: "",
            query: "",
            facetFilters: [["category.lvl0:electronics"]],
          },
        },
      ],
      index
    );

    expect(response[0]).toContainEqual({
      key: "electronics",
      doc_count: 6,
      selected: true,
    });
  });

  it("Applies numericFilters together with facetFilters", async () => {
    const index = createIndex(products, options);

    const response = await performSearchForFacetValues(
      [
        {
          indexName: "instant_search",
          params: {
            facetName: "category.lvl0",
            facetQuery: "",
            query: "",
            facetFilters: [["category.lvl0:electronics"]],
            numericFilters: ["price<=100"],
          },
        },
      ],
      index
    );

    const expectedCount = products.filter(
      (p) => p["category.lvl0"] === "electronics" && p.price <= 100
    ).length;

    expect(response[0]).toContainEqual({
      key: "electronics",
      doc_count: expectedCount,
      selected: true,
    });
  });

  it("Applies the query together with numericFilters", async () => {
    const index = createIndex(products, options);

    const response = await performSearchForFacetValues(
      [
        {
          indexName: "instant_search",
          params: {
            facetName: "category.lvl0",
            facetQuery: "",
            query: "shirt",
            numericFilters: ["price<=20"],
          },
        },
      ],
      index
    );

    const expected = index.search({
      query: "shirt",
      filter: (item) => item.price <= 20,
      per_page: products.length,
    }).data.items;

    const total = response[0].reduce((sum, b) => sum + b.doc_count, 0);
    expect(expected.length).toBeGreaterThan(0);
    expect(total).toBe(expected.length);
  });

  it("Returns null when there is no index", () => {
    expect(
      performSearchForFacetValues(
        [
          {
            indexName: "instant_search",
            params: { facetName: "price", facetQuery: "" },
          },
        ],
        null
      )
    ).toBeNull();
  });
});

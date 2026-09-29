import products from "./products.json";
import {
  performSearch,
  performSearchForFacetValues,
  searchForFacetValues,
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
      {
        value: "women's clothing",
        highlighted: "women's <mark>cloth</mark>ing",
        count: 6,
      },
      {
        value: "men's clothing",
        highlighted: "men's <mark>cloth</mark>ing",
        count: 4,
      },
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

  it("Highlights the query in hits with the requested tags", async () => {
    const index = createIndex(products, options);

    const response: Readonly<MultipleQueriesResponse<object>> =
      await performSearch(
        [
          {
            ...requests[0],
            params: {
              ...requests[0].params,
              query: "backpack",
              attributesToHighlight: ["title"],
              attributesToSnippet: ["description:4"],
            },
          },
        ],
        index
      );

    expect(response.results[0].hits[0]._highlightResult).toStrictEqual({
      title: {
        value:
          "Fjallraven - Foldsack No. 1 <ais-highlight-0000000000>Backpack</ais-highlight-0000000000>, Fits 15 Laptops",
        matchLevel: "full",
        matchedWords: ["backpack"],
        fullyHighlighted: false,
      },
    });
    expect(response.results[0].hits[0]._snippetResult).toStrictEqual({
      description: { value: "Your perfect pack for…", matchLevel: "none" },
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

describe("searchForFacetValues", () => {
  const cities = Array.from({ length: 30 }, (_value, i) => `City ${i}`);

  const index = createIndex(
    [
      ...cities.map((city, i) => ({
        id: `${i}`,
        name: city,
        names: [city],
        author: "Pratchett",
        year: 2000 + i,
      })),
      {
        id: "paris",
        name: "Paris",
        names: ["Paris", "Paname"],
        author: "Hugo",
        year: 1862,
      },
    ],
    {
      aggregations: {
        names: { size: 20, conjunction: false },
        author: { size: 20, conjunction: false },
      },
      searchableFields: ["name"],
      query: "",
    }
  );

  const search = async (params) => {
    const [response] = await searchForFacetValues(
      [{ indexName: "places", params: { facetName: "names", ...params } }],
      index
    );

    return response.facetHits.map(({ value }) => value);
  };

  it("finds values beyond the aggregation size", async () => {
    expect(await search({ facetQuery: "city 29" })).toStrictEqual(["City 29"]);
  });

  it("counts the values within the other filters", async () => {
    expect(
      await search({ facetQuery: "pa", facetFilters: [["author:Hugo"]] })
    ).toStrictEqual(["Paname", "Paris"]);
    expect(
      await search({ facetQuery: "pa", facetFilters: [["author:Pratchett"]] })
    ).toStrictEqual([]);
    expect(
      await search({
        facetQuery: "city",
        numericFilters: ["year>=2028"],
        maxFacetHits: 5,
      })
    ).toStrictEqual(["City 28", "City 29"]);
  });

  it("returns null when there is no index", () => {
    expect(
      searchForFacetValues(
        [
          {
            indexName: "places",
            params: { facetName: "names", facetQuery: "" },
          },
        ],
        null
      )
    ).toBeNull();
  });
});

describe("geosearch", () => {
  const places = [
    { id: 1, name: "Boston", region: "us", coordinates: [42.36, -71.06] },
    { id: 2, name: "New York", region: "us", coordinates: [40.71, -74.01] },
    { id: 3, name: "Paris", region: "eu", coordinates: [48.86, 2.35] },
    { id: 4, name: "Fiji", region: "pacific", coordinates: [-17.71, 178.07] },
    { id: 5, name: "Samoa", region: "pacific", coordinates: [-13.76, -172.1] },
    { id: 6, name: "Nowhere", region: "us" },
  ];

  const placeOptions: ItemsJsOptions = {
    searchableFields: ["name"],
    query: "",
    aggregations: { region: {} },
  };

  const geoOptions = { geoLocationField: "coordinates" };

  const search = (insideBoundingBox: string) =>
    performSearch(
      [
        {
          indexName: "places",
          params: {
            query: "",
            page: 0,
            hitsPerPage: 10,
            facets: ["region"],
            insideBoundingBox,
          },
        },
      ],
      createIndex(places, placeOptions),
      geoOptions
    );

  it("Returns only the hits inside the bounding box", async () => {
    const { results } = await search("45,-70,40,-80");
    const result = results[0] as any;

    expect(result.hits.map((hit) => hit.name).sort()).toStrictEqual([
      "Boston",
      "New York",
    ]);
    expect(result.nbHits).toBe(2);
    // ItemsJS keeps zero-count buckets when a filter function is applied
    expect(result.facets).toStrictEqual({
      region: { us: 2, eu: 0, pacific: 0 },
    });
  });

  it("Returns the hits inside a box crossing the antimeridian", async () => {
    const { results } = await search("-10,-170,-20,170");

    expect(
      (results[0] as any).hits.map((hit) => hit.name).sort()
    ).toStrictEqual(["Fiji", "Samoa"]);
  });

  it("Applies the bounding box to facet value searches", async () => {
    const [response] = await searchForFacetValues(
      [
        {
          indexName: "places",
          params: {
            facetName: "region",
            facetQuery: "",
            query: "",
            insideBoundingBox: "50,5,40,-80",
          },
        },
      ],
      createIndex(places, placeOptions),
      geoOptions
    );

    expect(response.facetHits).toStrictEqual([
      { value: "us", highlighted: "us", count: 2 },
      { value: "eu", highlighted: "eu", count: 1 },
    ]);
  });
});

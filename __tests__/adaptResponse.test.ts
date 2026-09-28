import {
  adaptFacets,
  adaptHit,
  adaptResponse,
  adaptFacetsStats,
  adaptFacetHits,
} from "../src/adaptResponse";
import { ItemsJsResponse } from "../src/itemsjsInterface";
import outputs from "./adaptResponseOutput.json";
import inputs from "./adaptResponseInput.json";

describe("adaptResponse tests", () => {
  it("adaptResponse should convert response to Instantsearch response", () => {
    const itemsjsResponse: ItemsJsResponse = inputs[0];

    const instantsearchResponse = adaptResponse(itemsjsResponse, "q", 5);

    expect(instantsearchResponse).toStrictEqual(outputs[0]);
  });
});

describe("adaptHit tests", () => {
  it("adaptHit should convert item to hit", () => {
    const item = {
      id: 3,
    };

    const adaptedItem = adaptHit(item);
    expect(adaptedItem.objectID).toBe(3);
    expect(adaptedItem._highlightResult).toMatchObject({});
  });
});

describe("adaptFacets tests", () => {
  it("adaptFacets should convert itemsJs aggregations to instantsearch facets", () => {
    const itemsJsFacets = {
      category: {
        buckets: [
          { key: "electronics", doc_count: 3, selected: false },
          { key: "women's clothing", doc_count: 2, selected: false },
          { key: "jewelery", doc_count: 5, selected: true },
          { key: "men's clothing", doc_count: 7, selected: false },
        ],
        name: "category",
        position: 1,
        title: "category",
      },
      color: {
        buckets: [
          { key: "red", doc_count: 3, selected: false },
          { key: "blue", doc_count: 2, selected: false },
          { key: "green", doc_count: 5, selected: true },
        ],
        name: "color",
        position: 2,
        title: "color",
      },
    };

    const instantsearchFacets = {
      category: {
        electronics: 3,
        "women's clothing": 2,
        jewelery: 5,
        "men's clothing": 7,
      },
      color: {
        red: 3,
        blue: 2,
        green: 5,
      },
    };

    const adaptResult = adaptFacets(itemsJsFacets);
    expect(adaptResult).toMatchObject(instantsearchFacets);
  });
});

describe("adaptFacetsStats tests", () => {
  it("adaptFacetsStats should only take the facet_stats from the aggregation object", () => {
    const aggregation = {
      category: {
        name: "category",
        title: "category",
      },
      price: {
        name: "price",
        title: "Price",
        facet_stats: {
          min: 7,
          max: 999,
          avg: 161.45,
          sum: 3229,
        },
      },
      rate: {
        name: "price",
        title: "Price",
        facet_stats: {
          min: 1,
          max: 5,
          avg: 3,
          sum: 26,
        },
      },
    };

    const result = {
      price: {
        min: 7,
        max: 999,
        avg: 161.45,
        sum: 3229,
      },
      rate: {
        min: 1,
        max: 5,
        avg: 3,
        sum: 26,
      },
    };

    const facetStats = adaptFacetsStats(aggregation);
    expect(facetStats).toStrictEqual(result);
  });
});

describe("adaptFacetHits tests", () => {
  const buckets = [
    { key: "Blue", doc_count: 5, selected: false },
    { key: "Light blue", doc_count: 3, selected: false },
    { key: "Red", doc_count: 2, selected: false },
    { key: "Navy blue", doc_count: 0, selected: false },
  ];

  it("filters by facetQuery (case-insensitive) and drops empty buckets", () => {
    expect(adaptFacetHits(buckets, "BLUE")).toStrictEqual({
      facetHits: [
        { value: "Blue", highlighted: "Blue", count: 5 },
        { value: "Light blue", highlighted: "Light blue", count: 3 },
      ],
      exhaustiveFacetsCount: true,
    });
  });

  it("returns every non-empty bucket without a facetQuery", () => {
    expect(adaptFacetHits(buckets).facetHits.map((h) => h.value)).toStrictEqual(
      ["Blue", "Light blue", "Red"]
    );
  });

  it("limits results to maxFacetHits", () => {
    expect(adaptFacetHits(buckets, "", 1).facetHits).toStrictEqual([
      { value: "Blue", highlighted: "Blue", count: 5 },
    ]);
  });
});

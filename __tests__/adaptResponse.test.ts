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
  const bucket = (key: string, doc_count = 1) => ({
    key,
    doc_count,
    selected: false,
  });

  const tags = { highlightPreTag: "[", highlightPostTag: "]" };

  const highlighted = (buckets, params = {}) =>
    adaptFacetHits(buckets, params).facetHits.map((hit) => hit.highlighted);

  it("matches the start of any word in the value", () => {
    expect(
      highlighted([bucket("New York"), bucket("Yonkers"), bucket("Albany")], {
        ...tags,
        facetQuery: "yo",
      })
    ).toStrictEqual(["New [Yo]rk", "[Yo]nkers"]);
  });

  it("does not match the middle of a word", () => {
    expect(
      highlighted([bucket("Boston")], { ...tags, facetQuery: "ost" })
    ).toStrictEqual([]);
  });

  it("requires every word in the query to match", () => {
    expect(
      highlighted([bucket("New York"), bucket("New Haven")], {
        ...tags,
        facetQuery: "new yo",
      })
    ).toStrictEqual(["[New] [Yo]rk"]);
  });

  it("ignores case and diacritics, highlighting the original text", () => {
    expect(
      highlighted([bucket("Émile Zola")], { ...tags, facetQuery: "EMI" })
    ).toStrictEqual(["[Émi]le Zola"]);
    expect(
      highlighted([bucket("Emile Zola")], { ...tags, facetQuery: "émi" })
    ).toStrictEqual(["[Emi]le Zola"]);
  });

  it("returns every non-empty bucket without a facetQuery", () => {
    expect(
      highlighted([bucket("Boston"), bucket("Cambridge"), bucket("Salem", 0)])
    ).toStrictEqual(["Boston", "Cambridge"]);
  });

  it("orders by count and limits results to maxFacetHits", () => {
    const buckets = [
      bucket("Book clubs", 1),
      bucket("Book signings", 5),
      bucket("Bookstores", 3),
    ];

    expect(
      adaptFacetHits(buckets, { facetQuery: "book", maxFacetHits: 2 })
    ).toStrictEqual({
      facetHits: [
        {
          value: "Book signings",
          highlighted: "<mark>Book</mark> signings",
          count: 5,
        },
        {
          value: "Bookstores",
          highlighted: "<mark>Book</mark>stores",
          count: 3,
        },
      ],
      exhaustiveFacetsCount: true,
    });
  });
});

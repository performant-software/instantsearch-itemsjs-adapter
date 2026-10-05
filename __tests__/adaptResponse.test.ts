import { describe, expect, it } from "vitest";
import {
  adaptFacets,
  adaptHit,
  adaptResponse,
  adaptFacetsStats,
  adaptFacetHits,
  adaptHighlightResult,
  adaptSnippetResult,
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
    expect(adaptedItem).not.toHaveProperty("_snippetResult");
  });

  it("adaptHit should add snippets when attributesToSnippet is set", () => {
    const adaptedItem = adaptHit({ id: 3, title: "Bag" }, "bag", {
      attributesToSnippet: ["title:2"],
    });

    expect(adaptedItem._snippetResult).toStrictEqual({
      title: { value: "<mark>Bag</mark>", matchLevel: "full" },
    });
  });
});

describe("adaptHighlightResult tests", () => {
  const tags = { highlightPreTag: "[", highlightPostTag: "]" };

  it("highlights word prefixes and reports the match level", () => {
    const item = { title: "New York Yankees", city: "Boston" };

    expect(adaptHighlightResult(item, "new yan", tags)).toStrictEqual({
      title: {
        value: "[New] York [Yan]kees",
        matchLevel: "full",
        matchedWords: ["new", "yan"],
        fullyHighlighted: false,
      },
      city: { value: "Boston", matchLevel: "none", matchedWords: [] },
    });

    expect(adaptHighlightResult(item, "york mets", tags).title).toStrictEqual({
      value: "New [York] Yankees",
      matchLevel: "partial",
      matchedWords: ["york"],
      fullyHighlighted: false,
    });
  });

  it("marks values where every word is highlighted in full", () => {
    expect(
      adaptHighlightResult({ title: "Émile Zola" }, "emile zola", tags).title
    ).toStrictEqual({
      value: "[Émile] [Zola]",
      matchLevel: "full",
      matchedWords: ["emile", "zola"],
      fullyHighlighted: true,
    });
  });

  it("leaves HTML in values unescaped, like Algolia", () => {
    expect(
      adaptHighlightResult({ title: "<b>Tom & Jerry</b>" }, "tom", {
        highlightPreTag: "<em>",
        highlightPostTag: "</em>",
      })
    ).toMatchObject({
      title: { value: "<b><em>Tom</em> & Jerry</b>" },
    });
  });

  it("highlights arrays and nested objects", () => {
    const item = { tags: ["red", "green"], author: { name: "Greg" } };

    expect(adaptHighlightResult(item, "gre", tags)).toMatchObject({
      tags: [{ value: "red" }, { value: "[gre]en" }],
      author: { name: { value: "[Gre]g" } },
    });
  });

  it("keeps empty array elements as empty values", () => {
    const item = { tags: ["red", null], dates: [{ start: [null, 1900] }] };
    const empty = { value: "", matchLevel: "none", matchedWords: [] };

    expect(adaptHighlightResult(item, "red", tags)).toStrictEqual({
      tags: [
        {
          value: "[red]",
          matchLevel: "full",
          matchedWords: ["red"],
          fullyHighlighted: true,
        },
        empty,
      ],
      dates: [
        {
          start: [
            empty,
            { value: "1900", matchLevel: "none", matchedWords: [] },
          ],
        },
      ],
    });
  });

  it("skips objectID, internal fields and empty values", () => {
    const item = {
      objectID: "1",
      _id: 1,
      _geoloc: { lat: 1, lng: 2 },
      title: "Bag",
      description: null,
    };

    expect(Object.keys(adaptHighlightResult(item, "bag", tags))).toStrictEqual([
      "title",
    ]);
  });

  it("only matches attributesToHighlight, including nested paths", () => {
    const item = { title: "Bag", brand: "Bagworks", author: { name: "Bea" } };

    expect(
      adaptHighlightResult(item, "b", {
        ...tags,
        attributesToHighlight: ["title", "author.name", "missing"],
      })
    ).toStrictEqual({
      title: {
        value: "[B]ag",
        matchLevel: "full",
        matchedWords: ["b"],
        fullyHighlighted: false,
      },
      brand: { value: "Bagworks", matchLevel: "none", matchedWords: [] },
      author: {
        name: {
          value: "[B]ea",
          matchLevel: "full",
          matchedWords: ["b"],
          fullyHighlighted: false,
        },
      },
    });

    expect(
      adaptHighlightResult(item, "b", { attributesToHighlight: [] })
    ).toStrictEqual({
      title: { value: "Bag", matchLevel: "none", matchedWords: [] },
      brand: { value: "Bagworks", matchLevel: "none", matchedWords: [] },
      author: { name: { value: "Bea", matchLevel: "none", matchedWords: [] } },
    });
  });

  it("matches the searchable fields by default", () => {
    const item = { title: "Bag & co", brand: "Bag & co" };

    expect(adaptHighlightResult(item, "bag", tags, ["title"])).toStrictEqual({
      title: {
        value: "[Bag] & co",
        matchLevel: "full",
        matchedWords: ["bag"],
        fullyHighlighted: false,
      },
      brand: { value: "Bag & co", matchLevel: "none", matchedWords: [] },
    });

    expect(
      adaptHighlightResult(item, "bag", {
        ...tags,
        attributesToHighlight: ["brand"],
      }, ["title"])
    ).toMatchObject({
      title: { value: "Bag & co", matchLevel: "none" },
      brand: { value: "[Bag] & co" },
    });
  });

  it("matches attributes inside arrays with or without the index", () => {
    const item = {
      authors: [{ name: "Bea" }, { name: "Ben" }],
      tags: ["bag"],
    };

    const highlight = (attributesToHighlight: string[]) =>
      adaptHighlightResult(item, "b", { ...tags, attributesToHighlight });

    expect(highlight(["authors.name"])).toMatchObject({
      authors: [{ name: { value: "[B]ea" } }, { name: { value: "[B]en" } }],
      tags: [{ value: "bag", matchLevel: "none" }],
    });
    expect(highlight(["authors.1.name", "tags"])).toMatchObject({
      authors: [{ name: { value: "Bea" } }, { name: { value: "[B]en" } }],
      tags: [{ value: "[b]ag" }],
    });
  });
});

describe("adaptSnippetResult tests", () => {
  const tags = { highlightPreTag: "[", highlightPostTag: "]" };
  const description =
    "one two three four five six seven eight nine ten eleven twelve.";

  it("crops around the first match and adds ellipses", () => {
    expect(
      adaptSnippetResult({ description }, "six", {
        ...tags,
        attributesToSnippet: ["description:5"],
      })
    ).toStrictEqual({
      description: {
        value: "…four five [six] seven eight…",
        matchLevel: "full",
      },
    });
  });

  it("keeps the window inside the text at either end", () => {
    const snippet = (query) =>
      adaptSnippetResult({ description }, query, {
        ...tags,
        attributesToSnippet: ["description:3"],
        snippetEllipsisText: "...",
      });

    expect(snippet("one")).toMatchObject({
      description: { value: "[one] two three..." },
    });
    expect(snippet("twelve")).toMatchObject({
      description: { value: "...ten eleven [twelve]." },
    });
    expect(snippet("missing")).toMatchObject({
      description: { value: "one two three...", matchLevel: "none" },
    });
  });

  it("returns short values whole, defaulting to 10 words", () => {
    expect(
      adaptSnippetResult({ title: "Tom & Jerry" }, "jer", {
        ...tags,
        attributesToSnippet: ["title", "missing"],
      })
    ).toStrictEqual({
      title: { value: "Tom & [Jer]ry", matchLevel: "full" },
    });

    expect(
      adaptSnippetResult({ description }, "", { attributesToSnippet: ["*"] })
    ).toMatchObject({
      description: {
        value: "one two three four five six seven eight nine ten…",
      },
    });
  });

  it("keeps empty array elements as empty values", () => {
    expect(
      adaptSnippetResult({ tags: ["red", null] }, "red", {
        ...tags,
        attributesToSnippet: ["tags"],
      })
    ).toStrictEqual({
      tags: [
        { value: "[red]", matchLevel: "full" },
        { value: "", matchLevel: "none" },
      ],
    });
  });

  it("returns nothing without attributesToSnippet", () => {
    expect(adaptSnippetResult({ description }, "six")).toStrictEqual({});
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

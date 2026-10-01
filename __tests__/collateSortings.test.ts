import { describe, expect, it } from "vitest";
import { createIndex, performSearch } from "../src/adapter";
import { ItemsJsOptions } from "../src/itemsjsInterface";

const data = [
  { id: 1, name: "zebra", price: 10, brand: { name: "Öko" } },
  { id: 2, name: "Éclair", price: 2, brand: { name: "acme" } },
  { id: 3, name: "apple", price: 30, brand: { name: "Zeta" } },
  { id: 4, name: "Zoo", price: 4 },
  { id: 5, name: "item 10", price: 5, brand: { name: "Beta" } },
  { id: 6, name: "item 2", price: 6, brand: { name: "omega" } },
  { id: 7, price: 7, brand: { name: "Alpha" } },
  { id: 8, name: "Banana", price: 8, brand: { name: "beta" } },
];

const options: ItemsJsOptions = {
  searchableFields: ["name"],
  query: "",
  sortings: {
    name_asc: { field: "name", order: "asc" },
    name_desc: { field: "name", order: "desc" },
    price_asc: { field: "price", order: "asc" },
    brand_asc: { field: "brand.name", order: "asc" },
    brand_price: { field: ["brand.name", "price"], order: ["asc", "asc"] },
  },
};

function sortedIds(index, sort: string): number[] {
  return index
    .search({ sort, per_page: data.length })
    .data.items.map((item) => item.id);
}

describe("collated sortings", () => {
  it("sorts strings by collator rather than code unit", () => {
    const index = createIndex(data, options);

    expect(sortedIds(index, "name_asc")).toStrictEqual([3, 8, 2, 6, 5, 1, 4, 7]);
  });

  it("keeps items missing the field last when descending", () => {
    const index = createIndex(data, options);

    expect(sortedIds(index, "name_desc")).toStrictEqual([
      4, 1, 5, 6, 2, 8, 3, 7,
    ]);
  });

  it("leaves number fields alone", () => {
    const index = createIndex(data, options);

    expect(sortedIds(index, "price_asc")).toStrictEqual([
      2, 4, 5, 6, 7, 8, 1, 3,
    ]);
  });

  it("sorts nested paths", () => {
    const index = createIndex(data, options);

    expect(sortedIds(index, "brand_asc")).toStrictEqual([
      2, 7, 8, 5, 1, 6, 3, 4,
    ]);
  });

  it("breaks collator ties with the next field", () => {
    const index = createIndex(data, options, {
      collator: new Intl.Collator(undefined, { sensitivity: "base" }),
    });

    // beta and Beta are equal ignoring case, so price orders them
    expect(sortedIds(index, "brand_price")).toStrictEqual([
      2, 7, 5, 8, 1, 6, 3, 4,
    ]);
  });

  it("uses the given collator", () => {
    const index = createIndex(data, options, {
      collator: new Intl.Collator("sv"),
    });

    // Swedish sorts Ö after Z
    expect(sortedIds(index, "brand_asc")).toStrictEqual([
      2, 7, 8, 5, 6, 3, 1, 4,
    ]);
  });

  it("keeps itemsjs' code unit order when collator is false", () => {
    const index = createIndex(data, options, { collator: false });

    expect(sortedIds(index, "name_asc")).toStrictEqual([8, 4, 3, 5, 6, 1, 2, 7]);
  });

  it("does not change the options passed in", () => {
    const sortings = structuredClone(options.sortings);

    createIndex(data, options);

    expect(options.sortings).toStrictEqual(sortings);
  });
});

describe("relevance sort", () => {
  const docs = [
    { id: 1, title: "red car" },
    { id: 2, title: "car car car" },
    { id: 3, title: "blue boat" },
    { id: 4, title: "car" },
  ];
  const docOptions: ItemsJsOptions = {
    searchableFields: ["title"],
    query: "",
    sortings: { title_asc: { field: "title", order: "asc" } },
  };

  function search(index, indexName: string) {
    return performSearch(
      [{ indexName, params: { query: "car", hitsPerPage: 10, page: 0 } }],
      index
    ).then(({ results }) => results[0].hits.map((hit) => hit["title"]));
  }

  it("keeps relevance order when the index name isn't a sorting", async () => {
    const index = createIndex(docs, docOptions);

    expect(await search(index, "instant_search")).toStrictEqual([
      "car car car",
      "car",
      "red car",
    ]);
  });

  it("still applies a named sorting", async () => {
    const index = createIndex(docs, docOptions);

    expect(await search(index, "title_asc")).toStrictEqual([
      "car",
      "car car car",
      "red car",
    ]);
  });
});

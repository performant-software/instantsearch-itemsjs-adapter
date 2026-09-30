// Itemsjs response to Instantsearch response

import {
  Hit,
  SearchForFacetValuesResponse,
  SearchResponse,
} from "@algolia/client-search";
import {
  HighlightOptions,
  ItemsJsBucket,
  ItemsJsResponse,
  SearchForFacetValuesQuery,
} from "./itemsjsInterface";

export function adaptResponse(
  response: ItemsJsResponse,
  query: string,
  processingTimeMS: number,
  highlightOptions: HighlightOptions = {},
  searchableFields?: ReadonlyArray<string>
): SearchResponse {
  const totalNumberOfPages = Math.ceil(
    response.pagination.total / response.pagination.per_page
  );

  return {
    hits: response.data.items.map((item) =>
      adaptHit(item, query, highlightOptions, searchableFields)
    ),
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

export function adaptHit(
  item,
  query = "",
  highlightOptions: HighlightOptions = {},
  searchableFields?: ReadonlyArray<string>
): Hit<object> {
  return {
    objectID: item.id,
    ...item,
    _highlightResult: adaptHighlightResult(
      item,
      query,
      highlightOptions,
      searchableFields
    ),
    // Like Algolia, only include snippets when attributes are requested
    ...(highlightOptions.attributesToSnippet?.length > 0 && {
      _snippetResult: adaptSnippetResult(item, query, highlightOptions),
    }),
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
const DEFAULT_SNIPPET_WORDS = 10;
const DEFAULT_SNIPPET_ELLIPSIS_TEXT = "…";

const WORD = /[\p{L}\p{N}]+/gu;

const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const getQueryWords = (query: string) =>
  query.normalize("NFC").match(WORD) || [];

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

// Wraps the start of every word in text that begins with one of the (folded)
// query words, and reports which query words matched by index
function highlightText(
  text: string,
  queryWords: string[],
  highlightPreTag: string,
  highlightPostTag: string
) {
  if (queryWords.length === 0) {
    // Nothing can match, so skip scanning the words
    return {
      value: text,
      matched: new Set<number>(),
      fullyHighlighted: false,
    };
  }

  let value = "";
  let offset = 0;
  let fullyHighlighted = true;
  const matched = new Set<number>();

  for (const { 0: word, index } of text.matchAll(WORD)) {
    const foldedWord = fold(word);
    let longest = "";

    queryWords.forEach((queryWord, i) => {
      if (foldedWord.startsWith(queryWord)) {
        matched.add(i);

        if (queryWord.length > longest.length) {
          longest = queryWord;
        }
      }
    });

    if (!longest) {
      fullyHighlighted = false;
      continue;
    }

    const length = getPrefixLength(word, longest);

    if (length < word.length) {
      fullyHighlighted = false;
    }

    value +=
      text.slice(offset, index) +
      highlightPreTag +
      word.slice(0, length) +
      highlightPostTag;
    offset = index + length;
  }

  return {
    value: value + text.slice(offset),
    matched,
    fullyHighlighted: fullyHighlighted && matched.size > 0,
  };
}

// Calls adaptText on every primitive value of the requested attributes, keeping
// the shape of arrays and nested objects. Attributes may be written as
// "name:count", e.g. "description:20" in attributesToSnippet.
function adaptAttributes(
  item: object,
  attributes: ReadonlyArray<string>,
  adaptText: (text: string, count?: number) => object
): Record<string, unknown> {
  const adaptValue = (value, count?: number) => {
    if (Array.isArray(value)) {
      return value.map((element) => adaptValue(element, count));
    }

    if (value !== null && typeof value === "object") {
      return adaptObject(value, count, () => true);
    }

    if (!["string", "number", "boolean"].includes(typeof value)) {
      return undefined;
    }

    return adaptText(String(value), count);
  };

  const adaptObject = (
    object: object,
    count: number,
    includeKey: (key) => boolean
  ) => {
    const result = {};

    Object.keys(object).forEach((key) => {
      const adapted = includeKey(key)
        ? adaptValue(object[key], count)
        : undefined;

      if (adapted !== undefined) {
        result[key] = adapted;
      }
    });

    return result;
  };

  const parsed = attributes.map((attribute) => {
    const [name, count] = attribute.split(":");
    return { name, count: count === undefined ? undefined : Number(count) };
  });

  const wildcard = parsed.find(({ name }) => name === "*");

  if (wildcard) {
    // Skip objectID and internal fields such as itemsjs' _id and _geoloc
    return adaptObject(
      item,
      wildcard.count,
      (key) => key !== "objectID" && !key.startsWith("_")
    );
  }

  const result = {};

  parsed.forEach(({ name, count }) => {
    const path = name.split(".");
    const adapted = adaptValue(
      path.reduce(
        (value, key) => (value == null ? undefined : value[key]),
        item
      ),
      count
    );

    if (adapted === undefined) {
      return;
    }

    let target = result;
    path.slice(0, -1).forEach((key) => {
      target[key] = target[key] || {};
      target = target[key];
    });
    target[path[path.length - 1]] = adapted;
  });

  return result;
}

const getMatchLevel = (matched: Set<number>, queryWords: string[]) => {
  if (matched.size === 0) {
    return "none";
  }

  return matched.size === queryWords.length ? "full" : "partial";
};

// Narrows the attributes to match in down to the ones that can include the
// value at key, as paths relative to it. An empty path means the value is part
// of an attribute. Array indexes are optional in the paths, so "authors.name"
// and "authors.0.name" both match authors[0].name.
function getChildAttributes(
  attributes: string[][],
  key: string,
  isArrayIndex: boolean
): string[][] {
  const children = [];

  attributes.forEach((attribute) => {
    if (attribute.length === 0) {
      children.push(attribute);
      return;
    }

    if (attribute[0] === key) {
      children.push(attribute.slice(1));
    }

    if (isArrayIndex) {
      children.push(attribute);
    }
  });

  return children;
}

// Like Typesense, every attribute is returned so any of them can be displayed
// with the Highlight widget, but the query is only matched in
// attributesToHighlight, which defaults to the index's searchable fields.
export function adaptHighlightResult(
  item: object,
  query = "",
  {
    attributesToHighlight,
    highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG,
    highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG,
  }: HighlightOptions = {},
  searchableFields?: ReadonlyArray<string>
): Record<string, unknown> {
  const queryWords = getQueryWords(query);
  const foldedQueryWords = queryWords.map(fold);

  const requested = attributesToHighlight ?? searchableFields ?? ["*"];

  // With no query nothing can match, so skip looking for the attributes
  let attributes: string[][] = [];

  if (queryWords.length > 0) {
    attributes = requested.includes("*")
      ? [[]]
      : requested.map((attribute) => attribute.split("."));
  }

  const highlight = (text: string) => {
    const { value, matched, fullyHighlighted } = highlightText(
      text,
      foldedQueryWords,
      highlightPreTag,
      highlightPostTag
    );

    if (matched.size === 0) {
      return { value, matchLevel: "none", matchedWords: [] };
    }

    return {
      value,
      matchLevel: getMatchLevel(matched, queryWords),
      matchedWords: [...matched]
        .sort((a, b) => a - b)
        .map((i) => queryWords[i]),
      fullyHighlighted,
    };
  };

  const adaptValue = (value, valueAttributes: string[][]) => {
    if (Array.isArray(value)) {
      return value.map((element, i) =>
        adaptValue(
          element,
          getChildAttributes(valueAttributes, String(i), true)
        )
      );
    }

    if (value !== null && typeof value === "object") {
      return adaptObject(value, valueAttributes, () => true);
    }

    if (!["string", "number", "boolean"].includes(typeof value)) {
      return undefined;
    }

    const text = String(value);

    if (valueAttributes.some((attribute) => attribute.length === 0)) {
      return highlight(text);
    }

    return { value: text, matchLevel: "none", matchedWords: [] };
  };

  const adaptObject = (
    object: object,
    objectAttributes: string[][],
    includeKey: (key: string) => boolean
  ) => {
    const result = {};

    Object.keys(object).forEach((key) => {
      const adapted = includeKey(key)
        ? adaptValue(
            object[key],
            getChildAttributes(objectAttributes, key, false)
          )
        : undefined;

      if (adapted !== undefined) {
        result[key] = adapted;
      }
    });

    return result;
  };

  // Skip objectID and internal fields such as itemsjs' _id and _geoloc
  return adaptObject(
    item,
    attributes,
    (key) => key !== "objectID" && !key.startsWith("_")
  );
}

// Crops text to wordCount words, centred on the first word matching the query
function cropText(text: string, queryWords: string[], wordCount: number) {
  const words = [...text.matchAll(WORD)];

  if (words.length <= wordCount) {
    return { text, croppedStart: false, croppedEnd: false };
  }

  const firstMatch = words.findIndex(({ 0: word }) => {
    const foldedWord = fold(word);
    return queryWords.some((queryWord) => foldedWord.startsWith(queryWord));
  });

  const start =
    firstMatch === -1
      ? 0
      : Math.max(
          0,
          Math.min(
            firstMatch - Math.floor((wordCount - 1) / 2),
            words.length - wordCount
          )
        );
  const end = start + wordCount;
  const lastWord = words[end - 1];

  return {
    text: text.slice(
      start === 0 ? 0 : words[start].index,
      end === words.length ? text.length : lastWord.index + lastWord[0].length
    ),
    croppedStart: start > 0,
    croppedEnd: end < words.length,
  };
}

export function adaptSnippetResult(
  item: object,
  query = "",
  {
    attributesToSnippet = [],
    highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG,
    highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG,
    snippetEllipsisText = DEFAULT_SNIPPET_ELLIPSIS_TEXT,
  }: HighlightOptions = {}
): Record<string, unknown> {
  const queryWords = getQueryWords(query).map(fold);

  return adaptAttributes(item, attributesToSnippet, (text, count) => {
    const wordCount =
      Number.isInteger(count) && count > 0 ? count : DEFAULT_SNIPPET_WORDS;
    const cropped = cropText(text, queryWords, wordCount);
    const { value, matched } = highlightText(
      cropped.text,
      queryWords,
      highlightPreTag,
      highlightPostTag
    );

    return {
      value:
        (cropped.croppedStart ? snippetEllipsisText : "") +
        value +
        (cropped.croppedEnd ? snippetEllipsisText : ""),
      matchLevel: getMatchLevel(matched, queryWords),
    };
  });
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

  const queryWords = getQueryWords(facetQuery).map(fold);

  const highlight = (value: string) => {
    const { value: highlighted, matched } = highlightText(
      value,
      queryWords,
      highlightPreTag,
      highlightPostTag
    );

    return matched.size === queryWords.length ? highlighted : null;
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

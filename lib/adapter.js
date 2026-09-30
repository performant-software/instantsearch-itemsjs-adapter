// src/adapter.ts
import itemsjs from "itemsjs";

// src/adaptResponse.ts
function adaptResponse(response, query, processingTimeMS, highlightOptions = {}) {
  const totalNumberOfPages = Math.ceil(
    response.pagination.total / response.pagination.per_page
  );
  return {
    hits: response.data.items.map(
      (item) => adaptHit(item, query, highlightOptions)
    ),
    page: response.pagination.page - 1,
    nbPages: totalNumberOfPages,
    hitsPerPage: response.pagination.per_page,
    nbHits: response.pagination.total,
    processingTimeMS,
    exhaustiveNbHits: true,
    query,
    params: "",
    facets: adaptFacets(response.data.aggregations),
    facets_stats: adaptFacetsStats(response.data.aggregations)
  };
}
function adaptHit(item, query = "", highlightOptions = {}) {
  return {
    objectID: item.id,
    ...item,
    _highlightResult: adaptHighlightResult(item, query, highlightOptions),
    // Like Algolia, only include snippets when attributes are requested
    ...highlightOptions.attributesToSnippet?.length > 0 && {
      _snippetResult: adaptSnippetResult(item, query, highlightOptions)
    }
  };
}
function adaptFacets(itemsJsFacets) {
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
function adaptFacetsStats(itemsJsFacetsStats) {
  const facetNames = Object.keys(itemsJsFacetsStats);
  const instantsearchFacetsStats = {};
  facetNames.forEach((name) => {
    if (itemsJsFacetsStats[name].facet_stats) {
      instantsearchFacetsStats[name] = itemsJsFacetsStats[name].facet_stats;
    }
  });
  return instantsearchFacetsStats;
}
var DEFAULT_MAX_FACET_HITS = 10;
var DEFAULT_HIGHLIGHT_PRE_TAG = "<mark>";
var DEFAULT_HIGHLIGHT_POST_TAG = "</mark>";
var DEFAULT_SNIPPET_WORDS = 10;
var DEFAULT_SNIPPET_ELLIPSIS_TEXT = "\u2026";
var WORD = /[\p{L}\p{N}]+/gu;
var HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
var fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
var getQueryWords = (query) => query.normalize("NFC").match(WORD) || [];
function getPrefixLength(word, prefix) {
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
function highlightText(text, queryWords, highlightPreTag, highlightPostTag, escape = escapeHtml) {
  if (queryWords.length === 0) {
    return {
      value: escape(text),
      matched: /* @__PURE__ */ new Set(),
      fullyHighlighted: false
    };
  }
  let value = "";
  let offset = 0;
  let fullyHighlighted = true;
  const matched = /* @__PURE__ */ new Set();
  for (const { 0: word, index: index2 } of text.matchAll(WORD)) {
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
    value += escape(text.slice(offset, index2)) + highlightPreTag + escape(word.slice(0, length)) + highlightPostTag;
    offset = index2 + length;
  }
  return {
    value: value + escape(text.slice(offset)),
    matched,
    fullyHighlighted: fullyHighlighted && matched.size > 0
  };
}
function adaptAttributes(item, attributes, adaptText) {
  const adaptValue = (value, count) => {
    if (Array.isArray(value)) {
      return value.map((element) => adaptValue(element, count));
    }
    if (value !== null && typeof value === "object") {
      return adaptObject(value, count, () => true);
    }
    if (!["string", "number", "boolean"].includes(typeof value)) {
      return void 0;
    }
    return adaptText(String(value), count);
  };
  const adaptObject = (object, count, includeKey) => {
    const result2 = {};
    Object.keys(object).forEach((key) => {
      const adapted = includeKey(key) ? adaptValue(object[key], count) : void 0;
      if (adapted !== void 0) {
        result2[key] = adapted;
      }
    });
    return result2;
  };
  const parsed = attributes.map((attribute) => {
    const [name, count] = attribute.split(":");
    return { name, count: count === void 0 ? void 0 : Number(count) };
  });
  const wildcard = parsed.find(({ name }) => name === "*");
  if (wildcard) {
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
        (value, key) => value == null ? void 0 : value[key],
        item
      ),
      count
    );
    if (adapted === void 0) {
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
var getMatchLevel = (matched, queryWords) => {
  if (matched.size === 0) {
    return "none";
  }
  return matched.size === queryWords.length ? "full" : "partial";
};
function adaptHighlightResult(item, query = "", {
  attributesToHighlight = ["*"],
  highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG,
  highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG
} = {}) {
  const queryWords = getQueryWords(query);
  const foldedQueryWords = queryWords.map(fold);
  return adaptAttributes(item, attributesToHighlight, (text) => {
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
      matchedWords: [...matched].sort((a, b) => a - b).map((i) => queryWords[i]),
      fullyHighlighted
    };
  });
}
function cropText(text, queryWords, wordCount) {
  const words = [...text.matchAll(WORD)];
  if (words.length <= wordCount) {
    return { text, croppedStart: false, croppedEnd: false };
  }
  const firstMatch = words.findIndex(({ 0: word }) => {
    const foldedWord = fold(word);
    return queryWords.some((queryWord) => foldedWord.startsWith(queryWord));
  });
  const start = firstMatch === -1 ? 0 : Math.max(
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
    croppedEnd: end < words.length
  };
}
function adaptSnippetResult(item, query = "", {
  attributesToSnippet = [],
  highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG,
  highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG,
  snippetEllipsisText = DEFAULT_SNIPPET_ELLIPSIS_TEXT
} = {}) {
  const queryWords = getQueryWords(query).map(fold);
  return adaptAttributes(item, attributesToSnippet, (text, count) => {
    const wordCount = Number.isInteger(count) && count > 0 ? count : DEFAULT_SNIPPET_WORDS;
    const cropped = cropText(text, queryWords, wordCount);
    const { value, matched } = highlightText(
      cropped.text,
      queryWords,
      highlightPreTag,
      highlightPostTag
    );
    return {
      value: (cropped.croppedStart ? snippetEllipsisText : "") + value + (cropped.croppedEnd ? snippetEllipsisText : ""),
      matchLevel: getMatchLevel(matched, queryWords)
    };
  });
}
function adaptFacetHits(buckets, params = {}) {
  const {
    facetQuery = "",
    highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG,
    highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG,
    maxFacetHits = DEFAULT_MAX_FACET_HITS
  } = params;
  const queryWords = getQueryWords(facetQuery).map(fold);
  const highlight = (value) => {
    const { value: highlighted, matched } = highlightText(
      value,
      queryWords,
      highlightPreTag,
      highlightPostTag,
      (text) => text
      // Facet values have always been returned unescaped
    );
    return matched.size === queryWords.length ? highlighted : null;
  };
  const facetHits = [];
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
    exhaustiveFacetsCount: true
  };
}

// src/adaptRequest.ts
var DEFAULT_GEO_LOCATION_FIELD = "_geoloc";
function adaptRequest(request, options = {}) {
  const numericFilters = request.params.numericFilters;
  const insideBoundingBox = request.params.insideBoundingBox;
  const facets = request.params.facets;
  const facetFilters = request.params.facetFilters;
  const sort = request.indexName;
  const response = {
    query: request.params.query,
    per_page: request.params.hitsPerPage,
    page: adaptPage(request.params.page),
    indexName: request.indexName,
    sort
  };
  if (facets) {
    response.aggregations = facets;
  }
  const filters = [];
  if (numericFilters && numericFilters.length > 0) {
    filters.push(...adaptNumericFilters(numericFilters));
  }
  if (insideBoundingBox) {
    filters.push(
      adaptBoundingBox(
        insideBoundingBox,
        options.geoLocationField || DEFAULT_GEO_LOCATION_FIELD
      )
    );
  }
  if (filters.length > 0) {
    response.filter = (item) => filters.every((filter) => filter(item));
  }
  if (facetFilters && facetFilters.length > 0) {
    response.filters = adaptFilters(facetFilters);
  }
  return response;
}
function adaptPage(page) {
  return page + 1;
}
function adaptFilters(instantsearchFacets) {
  let itemsJsFacets = {};
  if (Array.isArray(instantsearchFacets)) {
    instantsearchFacets.forEach((facets) => {
      if (Array.isArray(facets)) {
        facets.forEach((facet) => {
          itemsJsFacets = filterRegex(itemsJsFacets, facet);
        });
      } else {
        itemsJsFacets = filterRegex(itemsJsFacets, facets);
      }
    });
  } else {
    throw Error("request.params.facetFilters does not contain an array");
  }
  return itemsJsFacets;
}
function filterRegex(itemsJsFacets, facet) {
  const facetRegex = new RegExp(/(.+)(:)(.+)/);
  const [, name, , value] = facet.match(facetRegex);
  if (itemsJsFacets[name]) {
    itemsJsFacets[name].push(value);
  } else {
    itemsJsFacets[name] = [value];
  }
  return itemsJsFacets;
}
function parseRange(range) {
  return range.match(new RegExp(/([^<=!>]+)(<|<=|=|!=|>|>=)(\d+)/));
}
function adaptNumericFilters(ranges) {
  const filters = [];
  ranges.map((range) => {
    const [, field, operator, value] = parseRange(range);
    switch (operator) {
      case "<":
        filters.push((item) => item[field] < value);
        break;
      case "<=":
        filters.push((item) => item[field] <= value);
        break;
      case "=":
        filters.push((item) => item[field] == value);
        break;
      case "!=":
        filters.push((item) => item[field] != value);
        break;
      case ">":
        filters.push((item) => item[field] > value);
        break;
      case ">=":
        filters.push((item) => item[field] >= value);
        break;
    }
  });
  return filters;
}
function wrapLongitude(longitude) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}
function parseBoundingBox(insideBoundingBox) {
  const values = typeof insideBoundingBox === "string" ? insideBoundingBox.split(",") : insideBoundingBox[0];
  const [northEastLat, northEastLng, southWestLat, southWestLng] = values.map(Number);
  return {
    northEast: { lat: northEastLat, lng: wrapLongitude(northEastLng) },
    southWest: { lat: southWestLat, lng: wrapLongitude(southWestLng) }
  };
}
function getLatLng(value) {
  if (Array.isArray(value) && value.length === 2) {
    return { lat: Number(value[0]), lng: Number(value[1]) };
  }
  if (value && typeof value === "object" && "lat" in value && "lng" in value) {
    return { lat: Number(value.lat), lng: Number(value.lng) };
  }
  return null;
}
function adaptBoundingBox(insideBoundingBox, field) {
  const { northEast, southWest } = parseBoundingBox(insideBoundingBox);
  const crossesAntimeridian = southWest.lng > northEast.lng;
  return (item) => {
    const point = getLatLng(item[field]);
    if (!point || point.lat < southWest.lat || point.lat > northEast.lat) {
      return false;
    }
    return crossesAntimeridian ? point.lng >= southWest.lng || point.lng <= northEast.lng : point.lng >= southWest.lng && point.lng <= northEast.lng;
  };
}

// src/adapter.ts
var index;
function getSearchClient(newIndex, options) {
  return {
    search: (queries) => performSearch(queries, index || newIndex, options),
    searchForFacetValues: (queries) => searchForFacetValues(queries, index || newIndex, options)
  };
}
function createIndex(data, options) {
  index = itemsjs(data, options);
  return index;
}
function performSearch(requests, index2, options) {
  if (index2) {
    let processingTimeMS = 0;
    const responses = requests.map((request) => {
      const adaptedRequest = adaptRequest(request, options);
      const itemsJsRes = index2.search(adaptedRequest);
      processingTimeMS = processingTimeMS + itemsJsRes.timings.total;
      if (itemsJsRes.data.aggregations) {
        const filteredAggregations = {};
        Object.keys(itemsJsRes.data.aggregations).forEach((aggregationName) => {
          if (request.params.facets.includes(aggregationName)) {
            filteredAggregations[aggregationName] = itemsJsRes.data.aggregations[aggregationName];
          }
        });
        itemsJsRes.data.aggregations = filteredAggregations;
      }
      return adaptResponse(
        itemsJsRes,
        request.params.query,
        processingTimeMS,
        request.params
      );
    });
    return Promise.resolve({ results: responses });
  }
  return null;
}
function performSearchForFacetValues(requests, index2, options) {
  if (index2) {
    const responses = requests.map((request) => {
      const { filter, ...input } = adaptRequest(request, options);
      if (filter) {
        const matches = index2.search({
          query: input.query,
          filter,
          page: 1,
          per_page: Number.MAX_SAFE_INTEGER
        });
        input.ids = matches.data.items.map((item) => item.id);
        delete input.query;
      }
      const itemsJsRes = index2.aggregation({
        ...input,
        name: request.params.facetName,
        page: 1,
        per_page: Number.MAX_SAFE_INTEGER
      });
      return itemsJsRes.data.buckets;
    });
    return Promise.resolve(responses);
  }
  return null;
}
function searchForFacetValues(requests, index2, options) {
  const results = performSearchForFacetValues(requests, index2, options);
  if (results) {
    return results.then(
      (responses) => responses.map((buckets, i) => adaptFacetHits(buckets, requests[i].params))
    );
  }
  return null;
}
export {
  createIndex,
  getSearchClient,
  performSearch,
  performSearchForFacetValues,
  searchForFacetValues
};
//# sourceMappingURL=adapter.js.map
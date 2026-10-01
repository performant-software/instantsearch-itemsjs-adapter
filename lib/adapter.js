import itemsjs from "itemsjs";
//#region src/adaptResponse.ts
function adaptResponse(response, query, processingTimeMS, highlightOptions = {}, searchableFields) {
	const totalNumberOfPages = Math.ceil(response.pagination.total / response.pagination.per_page);
	return {
		hits: response.data.items.map((item) => adaptHit(item, query, highlightOptions, searchableFields)),
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
function adaptHit(item, query = "", highlightOptions = {}, searchableFields) {
	return {
		objectID: item.id,
		...item,
		_highlightResult: adaptHighlightResult(item, query, highlightOptions, searchableFields),
		...highlightOptions.attributesToSnippet?.length > 0 && { _snippetResult: adaptSnippetResult(item, query, highlightOptions) }
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
		if (itemsJsFacetsStats[name].facet_stats) instantsearchFacetsStats[name] = itemsJsFacetsStats[name].facet_stats;
	});
	return instantsearchFacetsStats;
}
const DEFAULT_MAX_FACET_HITS = 10;
const DEFAULT_HIGHLIGHT_PRE_TAG = "<mark>";
const DEFAULT_HIGHLIGHT_POST_TAG = "</mark>";
const DEFAULT_SNIPPET_WORDS = 10;
const DEFAULT_SNIPPET_ELLIPSIS_TEXT = "…";
const WORD = /[\p{L}\p{N}]+/gu;
const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const getQueryWords = (query) => query.normalize("NFC").match(WORD) || [];
function getPrefixLength(word, prefix) {
	let length = 0;
	let folded = "";
	for (const character of word) {
		if (folded.length >= prefix.length) break;
		folded += fold(character);
		length += character.length;
	}
	return length;
}
function highlightText(text, queryWords, highlightPreTag, highlightPostTag) {
	if (queryWords.length === 0) return {
		value: text,
		matched: /* @__PURE__ */ new Set(),
		fullyHighlighted: false
	};
	let value = "";
	let offset = 0;
	let fullyHighlighted = true;
	const matched = /* @__PURE__ */ new Set();
	for (const { 0: word, index } of text.matchAll(WORD)) {
		const foldedWord = fold(word);
		let longest = "";
		queryWords.forEach((queryWord, i) => {
			if (foldedWord.startsWith(queryWord)) {
				matched.add(i);
				if (queryWord.length > longest.length) longest = queryWord;
			}
		});
		if (!longest) {
			fullyHighlighted = false;
			continue;
		}
		const length = getPrefixLength(word, longest);
		if (length < word.length) fullyHighlighted = false;
		value += text.slice(offset, index) + highlightPreTag + word.slice(0, length) + highlightPostTag;
		offset = index + length;
	}
	return {
		value: value + text.slice(offset),
		matched,
		fullyHighlighted: fullyHighlighted && matched.size > 0
	};
}
function adaptAttributes(item, attributes, adaptText) {
	const adaptValue = (value, count) => {
		if (Array.isArray(value)) return value.map((element) => adaptValue(element, count));
		if (value !== null && typeof value === "object") return adaptObject(value, count, () => true);
		if (![
			"string",
			"number",
			"boolean"
		].includes(typeof value)) return;
		return adaptText(String(value), count);
	};
	const adaptObject = (object, count, includeKey) => {
		const result = {};
		Object.keys(object).forEach((key) => {
			const adapted = includeKey(key) ? adaptValue(object[key], count) : void 0;
			if (adapted !== void 0) result[key] = adapted;
		});
		return result;
	};
	const parsed = attributes.map((attribute) => {
		const [name, count] = attribute.split(":");
		return {
			name,
			count: count === void 0 ? void 0 : Number(count)
		};
	});
	const wildcard = parsed.find(({ name }) => name === "*");
	if (wildcard) return adaptObject(item, wildcard.count, (key) => key !== "objectID" && !key.startsWith("_"));
	const result = {};
	parsed.forEach(({ name, count }) => {
		const path = name.split(".");
		const adapted = adaptValue(path.reduce((value, key) => value == null ? void 0 : value[key], item), count);
		if (adapted === void 0) return;
		let target = result;
		path.slice(0, -1).forEach((key) => {
			target[key] = target[key] || {};
			target = target[key];
		});
		target[path[path.length - 1]] = adapted;
	});
	return result;
}
const getMatchLevel = (matched, queryWords) => {
	if (matched.size === 0) return "none";
	return matched.size === queryWords.length ? "full" : "partial";
};
function getChildAttributes(attributes, key, isArrayIndex) {
	const children = [];
	attributes.forEach((attribute) => {
		if (attribute.length === 0) {
			children.push(attribute);
			return;
		}
		if (attribute[0] === key) children.push(attribute.slice(1));
		if (isArrayIndex) children.push(attribute);
	});
	return children;
}
function adaptHighlightResult(item, query = "", { attributesToHighlight, highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG, highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG } = {}, searchableFields) {
	const queryWords = getQueryWords(query);
	const foldedQueryWords = queryWords.map(fold);
	const requested = attributesToHighlight ?? searchableFields ?? ["*"];
	let attributes = [];
	if (queryWords.length > 0) attributes = requested.includes("*") ? [[]] : requested.map((attribute) => attribute.split("."));
	const highlight = (text) => {
		const { value, matched, fullyHighlighted } = highlightText(text, foldedQueryWords, highlightPreTag, highlightPostTag);
		if (matched.size === 0) return {
			value,
			matchLevel: "none",
			matchedWords: []
		};
		return {
			value,
			matchLevel: getMatchLevel(matched, queryWords),
			matchedWords: [...matched].sort((a, b) => a - b).map((i) => queryWords[i]),
			fullyHighlighted
		};
	};
	const adaptValue = (value, valueAttributes) => {
		if (Array.isArray(value)) return value.map((element, i) => adaptValue(element, getChildAttributes(valueAttributes, String(i), true)));
		if (value !== null && typeof value === "object") return adaptObject(value, valueAttributes, () => true);
		if (![
			"string",
			"number",
			"boolean"
		].includes(typeof value)) return;
		const text = String(value);
		if (valueAttributes.some((attribute) => attribute.length === 0)) return highlight(text);
		return {
			value: text,
			matchLevel: "none",
			matchedWords: []
		};
	};
	const adaptObject = (object, objectAttributes, includeKey) => {
		const result = {};
		Object.keys(object).forEach((key) => {
			const adapted = includeKey(key) ? adaptValue(object[key], getChildAttributes(objectAttributes, key, false)) : void 0;
			if (adapted !== void 0) result[key] = adapted;
		});
		return result;
	};
	return adaptObject(item, attributes, (key) => key !== "objectID" && !key.startsWith("_"));
}
function cropText(text, queryWords, wordCount) {
	const words = [...text.matchAll(WORD)];
	if (words.length <= wordCount) return {
		text,
		croppedStart: false,
		croppedEnd: false
	};
	const firstMatch = words.findIndex(({ 0: word }) => {
		const foldedWord = fold(word);
		return queryWords.some((queryWord) => foldedWord.startsWith(queryWord));
	});
	const start = firstMatch === -1 ? 0 : Math.max(0, Math.min(firstMatch - Math.floor((wordCount - 1) / 2), words.length - wordCount));
	const end = start + wordCount;
	const lastWord = words[end - 1];
	return {
		text: text.slice(start === 0 ? 0 : words[start].index, end === words.length ? text.length : lastWord.index + lastWord[0].length),
		croppedStart: start > 0,
		croppedEnd: end < words.length
	};
}
function adaptSnippetResult(item, query = "", { attributesToSnippet = [], highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG, highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG, snippetEllipsisText = DEFAULT_SNIPPET_ELLIPSIS_TEXT } = {}) {
	const queryWords = getQueryWords(query).map(fold);
	return adaptAttributes(item, attributesToSnippet, (text, count) => {
		const cropped = cropText(text, queryWords, Number.isInteger(count) && count > 0 ? count : DEFAULT_SNIPPET_WORDS);
		const { value, matched } = highlightText(cropped.text, queryWords, highlightPreTag, highlightPostTag);
		return {
			value: (cropped.croppedStart ? snippetEllipsisText : "") + value + (cropped.croppedEnd ? snippetEllipsisText : ""),
			matchLevel: getMatchLevel(matched, queryWords)
		};
	});
}
function adaptFacetHits(buckets, params = {}) {
	const { facetQuery = "", highlightPostTag = DEFAULT_HIGHLIGHT_POST_TAG, highlightPreTag = DEFAULT_HIGHLIGHT_PRE_TAG, maxFacetHits = DEFAULT_MAX_FACET_HITS } = params;
	const queryWords = getQueryWords(facetQuery).map(fold);
	const highlight = (value) => {
		const { value: highlighted, matched } = highlightText(value, queryWords, highlightPreTag, highlightPostTag);
		return matched.size === queryWords.length ? highlighted : null;
	};
	const facetHits = [];
	const sorted = [...buckets].sort((a, b) => b.doc_count - a.doc_count);
	for (const { key, doc_count } of sorted) {
		if (facetHits.length >= maxFacetHits) break;
		const highlighted = doc_count > 0 ? highlight(key) : null;
		if (highlighted !== null) facetHits.push({
			value: key,
			highlighted,
			count: doc_count
		});
	}
	return {
		facetHits,
		exhaustiveFacetsCount: true
	};
}
//#endregion
//#region src/adaptRequest.ts
const DEFAULT_GEO_LOCATION_FIELD = "_geoloc";
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
	if (facets) response.aggregations = facets;
	const filters = [];
	if (numericFilters && numericFilters.length > 0) filters.push(...adaptNumericFilters(numericFilters));
	if (insideBoundingBox) filters.push(adaptBoundingBox(insideBoundingBox, options.geoLocationField || DEFAULT_GEO_LOCATION_FIELD));
	if (filters.length > 0) response.filter = (item) => filters.every((filter) => filter(item));
	if (facetFilters && facetFilters.length > 0) response.filters = adaptFilters(facetFilters);
	return response;
}
function adaptPage(page) {
	return page + 1;
}
function adaptFilters(instantsearchFacets) {
	let itemsJsFacets = {};
	if (Array.isArray(instantsearchFacets)) instantsearchFacets.forEach((facets) => {
		if (Array.isArray(facets)) facets.forEach((facet) => {
			itemsJsFacets = filterRegex(itemsJsFacets, facet);
		});
		else itemsJsFacets = filterRegex(itemsJsFacets, facets);
	});
	else throw Error("request.params.facetFilters does not contain an array");
	return itemsJsFacets;
}
function filterRegex(itemsJsFacets, facet) {
	const facetRegex = /* @__PURE__ */ new RegExp(/(.+)(:)(.+)/);
	const [, name, , value] = facet.match(facetRegex);
	if (itemsJsFacets[name]) itemsJsFacets[name].push(value);
	else itemsJsFacets[name] = [value];
	return itemsJsFacets;
}
function parseRange(range) {
	return range.match(/* @__PURE__ */ new RegExp(/^([^<=!>]+)(<=|>=|!=|<|>|=)(.+)$/));
}
function adaptNumericFilters(ranges) {
	const filters = [];
	ranges.map((range) => {
		const match = parseRange(range);
		if (!match) throw Error(`Invalid numeric filter: ${range}`);
		const [, field, operator, rawValue] = match;
		const value = Number(rawValue);
		if (rawValue.trim() === "" || Number.isNaN(value)) throw Error(`Invalid numeric filter value: ${range}`);
		const some = (item, test) => Array.isArray(item[field]) ? item[field].some(test) : test(item[field]);
		switch (operator) {
			case "<":
				filters.push((item) => some(item, (v) => v < value));
				break;
			case "<=":
				filters.push((item) => some(item, (v) => v <= value));
				break;
			case "=":
				filters.push((item) => some(item, (v) => v == value));
				break;
			case "!=":
				filters.push((item) => !some(item, (v) => v == value));
				break;
			case ">":
				filters.push((item) => some(item, (v) => v > value));
				break;
			case ">=": filters.push((item) => some(item, (v) => v >= value));
		}
	});
	return filters;
}
function wrapLongitude(longitude) {
	return ((longitude + 180) % 360 + 360) % 360 - 180;
}
function parseBoundingBox(insideBoundingBox) {
	const [northEastLat, northEastLng, southWestLat, southWestLng] = (typeof insideBoundingBox === "string" ? insideBoundingBox.split(",") : insideBoundingBox[0]).map(Number);
	return {
		northEast: {
			lat: northEastLat,
			lng: wrapLongitude(northEastLng)
		},
		southWest: {
			lat: southWestLat,
			lng: wrapLongitude(southWestLng)
		}
	};
}
function getLatLng(value) {
	if (Array.isArray(value) && value.length === 2) return {
		lat: Number(value[0]),
		lng: Number(value[1])
	};
	if (value && typeof value === "object" && "lat" in value && "lng" in value) return {
		lat: Number(value.lat),
		lng: Number(value.lng)
	};
	return null;
}
function getLatLngs(value) {
	return (Array.isArray(value) && value.some((location) => location && typeof location === "object") ? value : [value]).map(getLatLng).filter((point) => point !== null);
}
function adaptBoundingBox(insideBoundingBox, field) {
	const { northEast, southWest } = parseBoundingBox(insideBoundingBox);
	const crossesAntimeridian = southWest.lng > northEast.lng;
	const isInside = (point) => {
		if (point.lat < southWest.lat || point.lat > northEast.lat) return false;
		return crossesAntimeridian ? point.lng >= southWest.lng || point.lng <= northEast.lng : point.lng >= southWest.lng && point.lng <= northEast.lng;
	};
	return (item) => getLatLngs(item[field]).some(isInside);
}
//#endregion
//#region src/collateSortings.ts
const DEFAULT_COLLATOR = new Intl.Collator(void 0, { numeric: true });
function getValue(item, path) {
	if (path in item) return item[path];
	let value = item;
	for (const key of path.split(".")) {
		if (value == null) return;
		value = value[key];
	}
	return value;
}
function rankStrings(values, collator) {
	const ranks = /* @__PURE__ */ new Map();
	let rank = 0;
	let previous;
	for (const value of [...values].sort(collator.compare)) {
		if (previous !== void 0 && collator.compare(previous, value) !== 0) rank++;
		ranks.set(value, rank);
		previous = value;
	}
	return ranks;
}
function rankField(data, field, collator) {
	const values = /* @__PURE__ */ new Set();
	for (const item of data) {
		const value = getValue(item, field);
		if (typeof value === "string") values.add(value);
		else if (value != null) return null;
	}
	const ranks = rankStrings(values, collator);
	return (item) => ranks.get(getValue(item, field));
}
function collateSortings(data, sortings, collator = DEFAULT_COLLATOR) {
	const rankers = /* @__PURE__ */ new Map();
	const collated = {};
	for (const [name, sorting] of Object.entries(sortings)) {
		if (!sorting?.field) {
			collated[name] = sorting;
			continue;
		}
		const fields = Array.isArray(sorting.field) ? sorting.field : [sorting.field];
		const orders = Array.isArray(sorting.order) ? sorting.order : [sorting.order || "asc"];
		const newFields = [];
		const newOrders = [];
		fields.forEach((field, i) => {
			const order = orders[i] || "asc";
			if (typeof field !== "string") {
				newFields.push(field);
				newOrders.push(order);
				return;
			}
			if (!rankers.has(field)) rankers.set(field, rankField(data, field, collator));
			const ranker = rankers.get(field);
			if (ranker) {
				newFields.push((item) => getValue(item, field) == null ? 1 : 0);
				newOrders.push("asc");
				newFields.push(ranker);
			} else newFields.push(field);
			newOrders.push(order);
		});
		collated[name] = {
			...sorting,
			field: newFields,
			order: newOrders
		};
	}
	return collated;
}
//#endregion
//#region src/adapter.ts
let index;
const searchableFields = /* @__PURE__ */ new WeakMap();
const sortingNames = /* @__PURE__ */ new WeakMap();
function getSearchClient(newIndex, options) {
	return {
		search: (queries) => performSearch(queries, index || newIndex, options),
		searchForFacetValues: (queries) => searchForFacetValues(queries, index || newIndex, options)
	};
}
function createIndex(data, options, indexOptions = {}) {
	const { collator } = indexOptions;
	if (options.sortings && collator !== false && Array.isArray(data)) options = {
		...options,
		sortings: collateSortings(data, options.sortings, collator)
	};
	index = itemsjs(data, options);
	searchableFields.set(index, options.searchableFields);
	sortingNames.set(index, new Set(Object.keys(options.sortings || {})));
	return index;
}
function performSearch(requests, index, options) {
	if (index) {
		let processingTimeMS = 0;
		const responses = requests.map((request) => {
			const adaptedRequest = adaptRequest(request, options);
			const sortings = sortingNames.get(index);
			if (sortings && !sortings.has(adaptedRequest.sort)) delete adaptedRequest.sort;
			const itemsJsRes = index.search(adaptedRequest);
			processingTimeMS = processingTimeMS + itemsJsRes.timings.total;
			if (itemsJsRes.data.aggregations) {
				const filteredAggregations = {};
				Object.keys(itemsJsRes.data.aggregations).forEach((aggregationName) => {
					if (request.params.facets.includes(aggregationName)) filteredAggregations[aggregationName] = itemsJsRes.data.aggregations[aggregationName];
				});
				itemsJsRes.data.aggregations = filteredAggregations;
			}
			return adaptResponse(itemsJsRes, request.params.query, processingTimeMS, request.params, searchableFields.get(index));
		});
		return Promise.resolve({ results: responses });
	}
	return null;
}
function performSearchForFacetValues(requests, index, options) {
	if (index) {
		const responses = requests.map((request) => {
			const { filter, ...input } = adaptRequest(request, options);
			if (filter) {
				input.ids = index.search({
					query: input.query,
					filter,
					page: 1,
					per_page: Number.MAX_SAFE_INTEGER
				}).data.items.map((item) => item.id);
				delete input.query;
			}
			return index.aggregation({
				...input,
				name: request.params.facetName,
				page: 1,
				per_page: Number.MAX_SAFE_INTEGER
			}).data.buckets;
		});
		return Promise.resolve(responses);
	}
	return null;
}
function searchForFacetValues(requests, index, options) {
	const results = performSearchForFacetValues(requests, index, options);
	if (results) return results.then((responses) => responses.map((buckets, i) => adaptFacetHits(buckets, requests[i].params)));
	return null;
}
//#endregion
export { createIndex, getSearchClient, performSearch, performSearchForFacetValues, searchForFacetValues };

//# sourceMappingURL=adapter.js.map
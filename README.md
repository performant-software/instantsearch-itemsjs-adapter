<p align="center">
  <img src="https://github.com/unplatform-io/instantsearch-itemsjs-adapter/blob/main/logo-orange.svg" alt="Instantsearch-ItemsJS-adapter" width="200" height="200" />
</p>

<h1 align="center">Instantsearch-ItemsJS-adapter</h1>

<p align="center">This library is an adapter that connects the search engine <a href="https://github.com/itemsapi/itemsjs" target"_blank">ItemsJS</a> with the opensource tool <a href="https://github.com/algolia/instantsearch.js/" target"_blank">Instantsearch</a> (powered by <a href="https://www.algolia.com/)" target"_blank">Algolia</a>) that lets you quickly build a search interface in your front-end application.</p>

## Table of Content

🔧 [Installation](#installation)<br/>
✏️ [Usage](#usage)<br/>
👀 [Demo](#demo)<br/>
📜 [Features](#features)<br/>
🤝 [Contribute](#contribute)<br/>

## Installation
Use  `npm` to install `itemsjs-instantsearch-adapter`.
```
npm install instantsearch-itemsjs-adapter
```

Instantsearch-ItemsJS-adapter does not create any UI component by itself.  
To be able to create a search interface, you'll need to  [install  `Instantsearch`](https://www.algolia.com/doc/guides/building-search-ui/installation/js/) as well.

## Usage

```js
import { createIndex, getSearchClient } from  "instantsearch-itemsjs-adapter";

const data = [{ "id":1,"title": "Iphone 7", "category":"Apple","price":109.95 },
{"id":1,"title": "Samsung notce 10","category":"Samsung","price":109.95 }]

const  options = {
	searchableFields: ["title"],
	query:  "",
	aggregations: {
		category: {
			title:  "category",
			size:  10,
			conjunction:  false,
		},
		price: {
			show_facet_stats: true
		},
	},
	sortings: {
		price_asc: {
			field:  "price",
			order:  "asc",
		},
		price_desc: {
			field:  "price",
			order:  "desc",
		},
	},
};

const index = createIndex(data, options);

const searchClient = getSearchClient(index);
```
`options` Options are from the ItemsJS API found here: [ItemsJS](https://github.com/itemsapi/itemsjs)

### Geosearch

The adapter applies `insideBoundingBox` (as sent by the GeoSearch widget or `useGeoSearch`) as a filter. By default it reads each item's location from `_geoloc`, as either `{ lat, lng }` or `[lat, lng]`. Pass `geoLocationField` to read it from another field:

```js
const searchClient = getSearchClient(index, { geoLocationField: "coordinates" });
```

`performSearch` and `searchForFacetValues` accept the same options as a third argument.

## Demo

To see an implementation of this adapter go to [unplatform-io/clientside-instantsearch-demo](https://github.com/unplatform-io/clientside-instantsearch-demo).

## Features

### Supported Instantsearch components
| Component | | Explanation |
| --- | :---: | --- |
| Autocomplete | ❌ | Is not supported by ItemsJS |
| [Breadcrumb](#%EF%B8%8F-breadcrumb) | ✔️ |
| [ClearRefinements](#%EF%B8%8F-clearrefinements) | ✔️ |
| [Configure](#%EF%B8%8F-configure) | ✔️ |
| ConfigureRelatedItems | ❌ | Is not supported by ItemsJS |
| [CurrentRefinements](#%EF%B8%8F-currentrefinements) | ✔️ |
| DynamicWidgets | ❌ | Cannot be imported from react-instanstsearch-dom (version 6.12.1) |
| [GeoSearch](#geosearch) | ✔️ | Supports `insideBoundingBox` only |
| [HierarchicalMenu](#%EF%B8%8F-hierarchicalmenu) | ✔️ |
| [Highlight](#%EF%B8%8F-highlight) | ✔️ | Matches word prefixes; see below |
| [Hits](#%EF%B8%8F-hits) | ✔️ |
| [HitsPerPage](#%EF%B8%8F-hitsperpage) | ✔️ |
| Index | ❌ | Is not supported by ItemsJS |
| [InfiniteHits](#%EF%B8%8F-infinitehits) | ✔️ |
| [InstantSearch](#%EF%B8%8F-instantsearch) | ✔️ |
| [Menu](#%EF%B8%8F-menu) | ✔️ |
| [MenuSelect](#%EF%B8%8F-menuselect) | ✔️ |
| [NumericMenu](#%EF%B8%8F-numericmenu) | ✔️ |
| [Pagination](#%EF%B8%8F-pagination) | ✔️ |
| [Panel](#%EF%B8%8F-panel) | ✔️ |
| QueryRuleContext | ❌ | Is not supported by ItemsJS |
| QueryRuleCustomData | ❌ | Is not supported by ItemsJS |
| [RangeInput](#%EF%B8%8F-rangeinput) | ✔️ |
| [RangeSlider](#%EF%B8%8F-rangeslider) | ✔️ | |
| [RatingMenu](#%EF%B8%8F-ratingmenu) | ✔️ |
| [RefinementList](#%EF%B8%8F-refinementlist) | ✔️ |
| RelevantSort | ❌ | Is not supported by ItemsJS |
| [ScrollTo](#%EF%B8%8F-scrollto) | ✔️ |
| [SearchBox](#%EF%B8%8F-searchbox)| ✔️ |
| [SearchState](#%EF%B8%8F-searchstate) | ✔️ |
| [Snippet](#%EF%B8%8F-snippet) | ✔️ | Requires `attributesToSnippet`; see below |
| [SortBy](#%EF%B8%8F-sortby) | ✔️ |
| [StateResults](#%EF%B8%8F-stateresults) | ✔️ |
| [Stats](#%EF%B8%8F-stats) | ✔️ |
| [ToggleRefinement](#%EF%B8%8F-togglerefinement) | ✔️ |
| [VoiceSearch](#%EF%B8%8F-voicesearch) | ✔️ |

### ✔️ Breadcrumb
[Breadcrumb](https://www.algolia.com/doc/api-reference/widgets/breadcrumb/react/)

The `Breadcrumb` widget allows a user to see where the current page is in relation to the facet’s hierarchy.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attributes | ✔️ |
| separator | ✔️ |
| rootURL | ✔️ |
| transformItems | ✔️ |
| translations | ✔️ |

### ✔️ ClearRefinements
[ClearRefinements](https://www.algolia.com/doc/api-reference/widgets/clear-refinements/react/)

The `ClearRefinements` widget allows a user to delete all applied filters.

| Parameter |  | Explanation |
| --- | :---: | --- |
| clearsQuery | ✔️ |
| translations | ✔️ |
| transformItems | ✔️ |

### ✔️ Configure
[Configure](https://www.algolia.com/doc/api-reference/widgets/configure/react/)

The `Configure` widget allows a user to set fixed search parameters.

This widget can contain all [Search Parameters](https://www.algolia.com/doc/api-reference/search-api-parameters/), see this site for more information. ⚠️ The parameters are not tested, some may not work.

### ✔️ CurrentRefinements
[CurrentRefinements](https://www.algolia.com/doc/api-reference/widgets/current-refinements/react/)

The `CurrentRefinements` widget allows a user to see wich filters are apllied.

| Parameter |  | Explanation |
| --- | :---: | --- |
| clearsQuery | ❌ | Do not set this to true, the interface will no longer work properly. |
| transformItems | ✔️ |

### ✔️ HierarchicalMenu
[HierarchicalMenu](https://www.algolia.com/doc/api-reference/widgets/hierarchical-menu/react/)

The `HierarchicalMenu` widget allows a user to filter on a single value for an attribute.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attributes | ✔️ |
| defaultRefinement | ✔️ |
| facetOrdering | ❌ | Is not supported by ItemsJS |
| limit | ✔️ |
| showMore | ✔️ |
| showMoreLimit | ✔️ |
| separator | ❌ |
| rootPath | ✔️ |
| showParentLevel | ✔️ |
| transformItems | ✔️ |
| translations | ✔️ |

### ✔️ Highlight
[Highlight](https://www.algolia.com/doc/api-reference/widgets/highlight/react/)

The `Highlight` widget displays a hit's attribute with the parts matching the query highlighted.

ItemsJS doesn't report where the query matched, so the adapter finds the matches itself: a word in an attribute matches when it starts with a word of the query, ignoring case and diacritics. Stemmed matches from ItemsJS' full-text search, such as `running` for the query `run`, are only highlighted where they share the prefix.

Every attribute except `objectID` and fields starting with `_` is highlighted, including arrays and nested objects. To limit this, set `attributesToHighlight` with the [Configure](#%EF%B8%8F-configure) widget, e.g. `<Configure attributesToHighlight={["title", "author.name"]} />`.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| tagName | ✔️ |
| highlightedTagName | ✔️ |
| nonHighlightedTagName | ✔️ |
| separator | ✔️ |
| classNames | ✔️ |

### ✔️ Hits
[Hits](https://www.algolia.com/doc/api-reference/widgets/hits/react/)

The `Hits` widget allows a user to see the result of their search.

| Parameter |  | Explanation |
| --- | :---: | --- |
| hitComponent | ✔️ |

### ✔️ HitsPerPage
[HitsPerPage](https://www.algolia.com/doc/api-reference/widgets/hits-per-page/react/)

The `HitsPerPage` widget allows a user to select how many hits wil appear on a page.

| Parameter |  | Explanation |
| --- | :---: | --- |
| items | ✔️ |
| defaultRefinement | ✔️ |
| transformItems | ✔️ |

### ✔️ InfiniteHits
[InfiniteHits](https://www.algolia.com/doc/api-reference/widgets/infinite-hits/react/)

The `InfiniteHits` widget allows a user to see the result of their search.

| Parameter |  | Explanation |
| --- | :---: | --- |
| showPrevious | ⚠️ | Can only be used if URL Sync is implemented. |
| hitComponent | ✔️ |
| translations | ✔️ |
| cache | ✔️ |

### ✔️ InstantSearch
[InstantSearch](https://www.algolia.com/doc/api-reference/widgets/instantsearch/react/)

The `InstantSearch` widget allows a user to let all connected components (or widgets) interact with the searchState.

| Parameter |  | Explanation |
| --- | :---: | --- |
| indexName | ✔️ |
| searchClient | ✔️ |
| searchState | ✔️ |
| resultsState | ✔️ | 
| createURL | ✔️ | 
| onSearchStateChange | ✔️ |
| onSearchParameters | ✔️ |
| refresh | ⚠️ | There is no proof that this parameter works. | 
| stalledSearchDelay | ✔️ | 

### ✔️ Menu
[Menu](https://www.algolia.com/doc/api-reference/widgets/menu/react/)

The `Menu` widget allows a user to filter on a single value for an attribute.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| defaultRefinement | ✔️ |
| facetOrdering | ❌ | Is not supported by ItemsJS |
| limit | ✔️ |
| showMore | ✔️ |
| showMoreLimit | ✔️ |
| searchable | ✔️ | Every word in the query must match the start of a word in the value, ignoring case and diacritics, and the matched prefixes are highlighted. With numericFilters active, items need a truthy `id` |
| transformItems | ✔️ |
| translations | ✔️ |

### ✔️ MenuSelect
[MenuSelect](https://www.algolia.com/doc/api-reference/widgets/menu-select/react/)

The `MenuSelect` widget allows a user to filter on a single value for an attribute.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| defaultRefinement | ✔️ |
| facetOrdering | ❌ | Is not supported by ItemsJS |
| limit | ✔️ |
| transformItems | ✔️ |
| translations | ✔️ |

### ✔️ NumericMenu
[NumericMenu](https://www.algolia.com/doc/api-reference/widgets/numeric-menu/react/)

The `NumericMenu` widget allows a user to filter on a numeric field through the given ranges.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| items | ✔️ |
| defaultRefinement | ✔️ |
| transformItems | ✔️ |
| translations | ✔️ |

⚠️ ItemsJS `show_facet_stats` needs to be true, for more information see [Facet Stats](#facet-stats).

### ✔️ Pagination
[Pagination](https://www.algolia.com/doc/api-reference/widgets/pagination/react/)

The `Pagination` widget allows a user to change the current page.

| Parameter |  | Explanation |
| --- | :---: | --- |
| defaultRefinement | ✔️ |
| showFirst | ✔️ |
| showPrevious | ✔️ |
| showNext | ✔️ |
| showLast | ✔️ |
| padding | ✔️ |
| totalPages | ✔️ |
| translations | ✔️ |

### ✔️ Panel
[Panel](https://www.algolia.com/doc/api-reference/widgets/panel/react/)

The `Panel` widget allows a user to wrap other widgets in a consistent design.

| Parameter |  | Explanation |
| --- | :---: | --- |
| className | ✔️ |
| header | ✔️ |
| footer | ✔️ |

### ✔️ RangeInput
[RangeInput](https://www.algolia.com/doc/api-reference/widgets/range-input/js/)

The `rangeInput` widget allows a user to filter on a numeric field using a minimum and/or maximum input.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| defaultRefinement | ✔️ |
| min | ✔️ |
| max | ✔️ |
| precision | ✔️ |
| translations | ✔️ |

⚠️ ItemsJS `show_facet_stats` needs to be true, for more information see [Facet Stats](#facet-stats).

### ✔️ RangeSlider
[RangeSlider](https://www.algolia.com/doc/api-reference/widgets/range-slider/react/)

The `RangeSlider` widget allows a user to filter on a numeric field using a minimum and/or maximum input.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| defaultRefinement | ✔️ |
| min | ✔️ |
| max | ✔️ |

⚠️ ItemsJS `show_facet_stats` needs to be true, for more information see [Facet Stats](#facet-stats).

### ✔️ RatingMenu
[RatingMenu](https://www.algolia.com/doc/api-reference/widgets/rating-menu/react/)

The `RatingMenu` widget allows a user to filter on a numeric field by clicking on stars.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| defaultRefinement | ✔️ |
| min | ✔️ |
| max | ✔️ |
| translations | ✔️ |

⚠️ ItemsJS `show_facet_stats` needs to be true, for more information see [Facet Stats](#facet-stats).

### ✔️ RefinementList
[RefinementList](https://www.algolia.com/doc/api-reference/widgets/refinement-list/react/)

The `RefinementList` widget allows a user to filter on a facet/field.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| defaultRefinement | ✔️ |
| facetOrdering | ❌ | Is not supported by ItemsJS |
| operator | ❌ | ✔️Buildtime workaround available, see below |
| limit | ✔️ |
| showMore | ✔️ |
| showMoreLimit | ✔️ |
| searchable | ✔️ | Every word in the query must match the start of a word in the value, ignoring case and diacritics, and the matched prefixes are highlighted. With numericFilters active, items need a truthy `id` |
| transformItems | ✔️ |
| translations | ✔️ |

✔️Operator workaround: <br />
 Can be passed to ItemsJS buildtime (not available at runtime).<br />
 Set `conjunction` to true (OR operator) or false (AND operator). <br />
 
```js
aggregations: {
    category: {
      title: "category",
      conjunction: false,
    }
}
```

### ✔️ ScrollTo
[ScrollTo](https://www.algolia.com/doc/api-reference/widgets/scroll-to/react/)

The `ScrollTo` widget allows a user to automatically scroll to an object when the searchState is adjusted.

| Parameter |  | Explanation |
| --- | :---: | --- |
| scrollOn | ✔️ |

### ✔️ SearchBox
[SearchBox](https://www.algolia.com/doc/api-reference/widgets/search-box/react/)

The `SearchBox` widget allows a user to search text based.

| Parameter |  | Explanation |
| --- | :---: | --- |
| defaultRefinement | ⚠️ | Text appears in the search box but the dataset is not searched. |
| autoFocus | ✔️ |
| searchAsYouType | ✔️ |
| showLoadingIndicator | ✔️ | There is no proof that this parameter works. |
| submit | ✔️ | There is no proof that this parameter works. |
| reset | ✔️ |
| loadingIndicator | ✔️ | There is no proof that this parameter works. |
| focusShortcuts | ✔️ |
| onSubmit | ✔️ |
| onReset | ✔️ |
| on* | ✔️ |
| translations | ✔️ |

### ✔️ SearchState
[SearchState](https://www.algolia.com/doc/api-reference/widgets/ui-state/react/)

The `SearchState` widget allows a user to update their search parameters. When updated automaticly searched.

### ✔️ Snippet
[Snippet](https://www.algolia.com/doc/api-reference/widgets/snippet/react/)

The `Snippet` widget displays an excerpt of a hit's attribute, with the query highlighted the same way as in [Highlight](#%EF%B8%8F-highlight).

As with Algolia, no snippets are returned until you list the attributes in `attributesToSnippet`, optionally with a word count (10 by default): `<Configure attributesToSnippet={["description:20"]} />`. Longer values are cropped to that many words, centred on the first word matching the query, and `snippetEllipsisText` (`…` by default) marks where text was cut.

| Parameter |  | Explanation |
| --- | :---: | --- |
| attribute | ✔️ |
| tagName | ✔️ |
| highlightedTagName | ✔️ |
| nonHighlightedTagName | ✔️ |
| separator | ✔️ |
| classNames | ✔️ |

### ✔️ SortBy
[Sortby](https://www.algolia.com/doc/api-reference/widgets/sort-by/js/)

The `sortBy` widget allows a user to change the way hits are sorted. 

| Parameter |  | Explanation |
| --- | :---: | --- |
| items | ✔️ |
| defaultRefinement | ✔️ |
| transformItems | ✔️ |

With Instantsearch-ItemsJS-adapter you have to define the same key from your configuration `sorting` for the sortBy value.
ItemsJS documentation for the configuration and searching can be found here [ItemsJS configuration](https://github.com/itemsapi/itemsjs/blob/master/docs/configuration.md)

```js
sortings:  { 
	price_asc:  { field:  "price", order:  "asc",  }, 
	price_desc:  { field:  "price", order:  "desc", },  
},

<SortBy
	defaultRefinement=""
	items={[
		{ value:  "price_desc", label:  "High to low" },
		{ value:  "price_asc", label:  "Low to high" },
	]} 
/>
```

The usage of the `sortBy` widget differs from the one found in Aloglia's documentation.
Instantsearch-ItemsJS-adapter does not make use of a [replica indices](https://www.algolia.com/doc/guides/sending-and-managing-data/manage-your-indices/#replicating-an-index) 

### ✔️ StateResults
[StateResults](https://www.algolia.com/doc/api-reference/widgets/state-results/react/)

The `StateResults` widget allows a user to access the searchState and the searchResults of InstantSearch. For instance, this widget allows you to create results/no results or query/no query pages.

### ✔️ Stats
[Stats](https://www.algolia.com/doc/api-reference/widgets/stats/react/)

The `Stats` widget allows a user to displays the total number of matching hits and the time it took to get them (time spent in ItemsJS)

| Parameter | | Explanation |
| --- | :---: | --- |
| translations | ✔️ | |

### ✔️ ToggleRefinement
[ToggleRefinement](https://www.algolia.com/doc/api-reference/widgets/toggle-refinement/react/)

The `ToggleRefinement` widget allows a user to on/off filtering feature based on an attribute value

| Parameter | | Explanation |
| --- | :---: | --- |
| attribute | ✔️ | |
| label | ✔️ |
| value | ✔️ |
| defaultRefinement | ✔️ | |

### ✔️ VoiceSearch
[VoiceSearch](https://www.algolia.com/doc/api-reference/widgets/voice-search/react/)

The `VoiceSearch` widget allows a user to perform a voice-based query.

| Parameter | | Explanation |
| --- | :---: | --- |
| searchAsYouSpeak | ✔️ | |
| buttonTextComponent | ✔️ |
| statusComponent | ✔️ |
| translations | ✔️ |

### Facet Stats
For all nummeric fields `show_facet_stats: true` is required to calculate Instantsearch `facet_stats` and to avoid errors, it should be passed to ItemsJS, as shown below.

```js
aggregations: {
    price: { show_facet_stats: true, }, 
},

<NumericMenu 
	attribute="price"
	items={[
              { label: "Less than 10", end: 10 },
              { label: "10 till 25", start: 10, end: 25 },
              { label: "25 till 50", start: 25, end: 50 },
              { label: "More than 50", start: 50 },
        ]} 
/>
<RangeInput attribute="price" />
<RangeSlider attribute="price" />
<RatingMenu attribute="price" />
```

## Contribute
Help to this project is appreciated. If you want to help please use Vitest and ESlint mentioned below, before creating a pull request.

### [Vitest](https://vitest.dev/)

To check functionalities run the Vitest tests, and if you make a new functionality also write some tests for this code.

```bash

npm run test

```

### [ESlint](https://eslint.org/)

To keep the code clean run ESlint and resolve the errors when you're done programming.

```bash
npm run eslint
```
To automaticly resolve the errors run:
```bash
npm run eslint:fix
```

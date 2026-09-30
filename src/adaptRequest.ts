// Instantsearch request to itemsjs request
import {
  AdapterOptions,
  ItemsJsRequest,
  SearchRequest,
} from "./itemsjsInterface";

const DEFAULT_GEO_LOCATION_FIELD = "_geoloc";

export function adaptRequest(
  request: SearchRequest,
  options: AdapterOptions = {}
): ItemsJsRequest {
  const numericFilters = <string[]>request.params.numericFilters;
  const insideBoundingBox = request.params.insideBoundingBox;
  const facets = <string[]>request.params.facets;
  const facetFilters = request.params.facetFilters;
  const sort = request.indexName; // IndexName will be assigned the SortBy value if selected.

  const response: ItemsJsRequest = {
    query: request.params.query,
    per_page: request.params.hitsPerPage,
    page: adaptPage(request.params.page),
    indexName: request.indexName,
    sort: sort,
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

export function adaptPage(page: number): number {
  // ItemsJS pages start at 1 iso 0
  return page + 1;
}

export function adaptFilters(instantsearchFacets) {
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

export function filterRegex(itemsJsFacets, facet) {
  const facetRegex = new RegExp(/(.+)(:)(.+)/);
  const [, name, , value] = facet.match(facetRegex);
  if (itemsJsFacets[name]) {
    itemsJsFacets[name].push(value);
  } else {
    itemsJsFacets[name] = [value];
  }
  return itemsJsFacets;
}

export function parseRange(range) {
  /*
   * Group 1: Find chars, one or more, except values: "<, =, !, >".
   * Group 2: Find operator
   * Group 3: Find digits, one or more.
   */
  return range.match(new RegExp(/([^<=!>]+)(<|<=|=|!=|>|>=)(\d+)/));
}

export function adaptNumericFilters(ranges) {
  const filters = [];

  ranges.map((range) => {
    // ['price<=10', 'price', '<=', '10']
    const [, field, operator, value] = parseRange(range);

    switch (operator) {
      case "<":
        filters.push((item) => item[field] < value);
        break;
      case "<=":
        filters.push((item) => item[field] <= value);
        break;
      case "=":
        filters.push((item) => item[field] == value); // Needs to be comparison operator "=="
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

export function wrapLongitude(longitude: number): number {
  // Maps can report longitudes outside [-180, 180] once the world has wrapped
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function parseBoundingBox(
  insideBoundingBox: string | ReadonlyArray<ReadonlyArray<number>>
) {
  // InstantSearch sends "neLat,neLng,swLat,swLng"; Algolia also accepts [[neLat, neLng, swLat, swLng]]
  const values =
    typeof insideBoundingBox === "string"
      ? insideBoundingBox.split(",")
      : insideBoundingBox[0];

  const [northEastLat, northEastLng, southWestLat, southWestLng] =
    values.map(Number);

  return {
    northEast: { lat: northEastLat, lng: wrapLongitude(northEastLng) },
    southWest: { lat: southWestLat, lng: wrapLongitude(southWestLng) },
  };
}

export function getLatLng(value): { lat: number; lng: number } | null {
  // Accepts Algolia's { lat, lng } objects and Typesense's [lat, lng] geopoints
  if (Array.isArray(value) && value.length === 2) {
    return { lat: Number(value[0]), lng: Number(value[1]) };
  }

  if (value && typeof value === "object" && "lat" in value && "lng" in value) {
    return { lat: Number(value.lat), lng: Number(value.lng) };
  }

  return null;
}

export function adaptBoundingBox(
  insideBoundingBox: string | ReadonlyArray<ReadonlyArray<number>>,
  field: string
) {
  const { northEast, southWest } = parseBoundingBox(insideBoundingBox);
  const crossesAntimeridian = southWest.lng > northEast.lng;

  return (item) => {
    const point = getLatLng(item[field]);

    if (!point || point.lat < southWest.lat || point.lat > northEast.lat) {
      return false;
    }

    return crossesAntimeridian
      ? point.lng >= southWest.lng || point.lng <= northEast.lng
      : point.lng >= southWest.lng && point.lng <= northEast.lng;
  };
}

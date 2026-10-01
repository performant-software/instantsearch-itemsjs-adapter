type Item = Record<string, unknown>;
type SortKey = string | ((item: Item) => unknown);

interface Sorting {
  field?: SortKey | SortKey[];
  order?: string | string[];
}

const DEFAULT_COLLATOR = new Intl.Collator(undefined, { numeric: true });

// Same lookup as orderBy's string iteratee: a key, else a dotted path
function getValue(item: Item, path: string): unknown {
  if (path in item) {
    return item[path];
  }

  let value: unknown = item;
  for (const key of path.split(".")) {
    if (value == null) {
      return undefined;
    }
    value = value[key];
  }
  return value;
}

// Collator-equal values share a rank so orderBy keeps them in data order
function rankStrings(
  values: Set<string>,
  collator: Intl.Collator
): Map<string, number> {
  const ranks = new Map<string, number>();
  let rank = 0;
  let previous: string;

  for (const value of [...values].sort(collator.compare)) {
    if (previous !== undefined && collator.compare(previous, value) !== 0) {
      rank++;
    }
    ranks.set(value, rank);
    previous = value;
  }

  return ranks;
}

// The rank lookup for a field, or null when it holds anything but strings
function rankField(
  data: Item[],
  field: string,
  collator: Intl.Collator
): ((item: Item) => number) | null {
  const values = new Set<string>();

  for (const item of data) {
    const value = getValue(item, field);
    if (typeof value === "string") {
      values.add(value);
    } else if (value != null) {
      return null;
    }
  }

  const ranks = rankStrings(values, collator);
  return (item) => ranks.get(getValue(item, field) as string);
}

// Replaces each string field in the sortings with its collated rank
export function collateSortings(
  data: Item[],
  sortings: object,
  collator: Intl.Collator = DEFAULT_COLLATOR
): Record<string, Sorting> {
  const rankers = new Map<string, ((item: Item) => number) | null>();
  const collated = {};

  for (const [name, sorting] of Object.entries(
    sortings as Record<string, Sorting>
  )) {
    if (!sorting?.field) {
      collated[name] = sorting;
      continue;
    }

    const fields = Array.isArray(sorting.field)
      ? sorting.field
      : [sorting.field];
    const orders = Array.isArray(sorting.order)
      ? sorting.order
      : [sorting.order || "asc"];
    const newFields: SortKey[] = [];
    const newOrders: string[] = [];

    fields.forEach((field, i) => {
      const order = orders[i] || "asc";

      if (typeof field !== "string") {
        newFields.push(field);
        newOrders.push(order);
        return;
      }

      if (!rankers.has(field)) {
        rankers.set(field, rankField(data, field, collator));
      }
      const ranker = rankers.get(field);

      if (ranker) {
        newFields.push((item) => (getValue(item, field) == null ? 1 : 0));
        newOrders.push("asc");
        newFields.push(ranker);
      } else {
        newFields.push(field);
      }
      newOrders.push(order);
    });

    collated[name] = { ...sorting, field: newFields, order: newOrders };
  }

  return collated;
}

/**
 * Query-string serialisation shared by every list endpoint.
 *
 * Extracted the moment a second module needed it: three modules each
 * deciding for themselves how to encode a filter is how one of them ends
 * up sending `search=` and quietly returning nothing.
 */
export type QueryParamValue = string | number | boolean | undefined | null;

/**
 * Serialises only the params that carry a real value.
 *
 * Empty strings are DROPPED, not sent: the backend treats `search=` as a
 * filter matching nothing, so clearing a search box would empty the table
 * instead of restoring it. `null`/`undefined` are dropped for the same
 * reason — "no filter" and "filter by nothing" are different requests.
 */
export function toQueryString(params: Record<string, QueryParamValue>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    query.set(key, String(value));
  }

  const serialised = query.toString();
  return serialised ? `?${serialised}` : '';
}

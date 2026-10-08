/**
 * The shape api-colombia.com actually returns, transcribed from live
 * responses to `GET /Department` and `GET /City` (verified against the
 * published OpenAPI document).
 *
 * These types exist so the raw payload is described exactly once, at the
 * edge, and never leaks inward — `api-colombia.mapper.ts` converts them
 * into the domain types immediately. Only the fields this system consumes
 * are declared; the API returns many more (population, surface, airports,
 * touristAttractions, …) that are none of our business.
 *
 * NOTE ON DANE CODES: neither response carries one. `City.postalCode`
 * exists and is NOT a DANE code — postal codes and DANE codes are
 * unrelated Colombian numbering systems, and treating one as the other
 * would silently corrupt every future integration with an official
 * source. It is therefore deliberately not mapped.
 */

export interface ApiColombiaDepartment {
  id: number;
  name: string;
}

export interface ApiColombiaCity {
  id: number;
  name: string;
  /** api-colombia's own department id — matches `ApiColombiaDepartment.id`. */
  departmentId: number;
}

/**
 * Narrowing guards. The payload crosses a trust boundary, so it is
 * validated rather than cast: an upstream shape change must fail loudly
 * during the seed, not write half a catalog of `undefined` names.
 */
export function isApiColombiaDepartment(value: unknown): value is ApiColombiaDepartment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ApiColombiaDepartment>;
  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0
  );
}

export function isApiColombiaCity(value: unknown): value is ApiColombiaCity {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ApiColombiaCity>;
  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.departmentId === 'number' &&
    Number.isFinite(candidate.departmentId)
  );
}

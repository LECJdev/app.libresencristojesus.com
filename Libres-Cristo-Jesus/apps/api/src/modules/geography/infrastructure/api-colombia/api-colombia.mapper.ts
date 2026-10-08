import type { GeoDepartment } from '../../domain/geo-department';
import type { GeoMunicipality } from '../../domain/geo-municipality';
import type { ApiColombiaCity, ApiColombiaDepartment } from './api-colombia.types';

/**
 * Translates api-colombia.com payloads into domain objects.
 *
 * Kept as pure functions in their own file so the translation is testable
 * without a network, and so the rule "the outside world stops here" has a
 * single, obvious home.
 *
 * `codeDane` is always `null`: this source does not publish DANE codes
 * (see `api-colombia.types.ts`). Inventing or deriving one would be worse
 * than leaving it empty — a wrong official code is indistinguishable from
 * a right one until it corrupts a real integration.
 */

export function toGeoDepartment(raw: ApiColombiaDepartment): GeoDepartment {
  return {
    externalId: String(raw.id),
    name: raw.name.trim(),
    codeDane: null,
  };
}

export function toGeoMunicipality(raw: ApiColombiaCity): GeoMunicipality {
  return {
    externalId: String(raw.id),
    name: raw.name.trim(),
    codeDane: null,
    departmentExternalId: String(raw.departmentId),
  };
}

import type { DistrictNode } from '@lcj/types';

/**
 * Pure client-side derivations over data the `OrganizationTree` already
 * carries — no extra request, no invented number.
 *
 * `DistrictNode` has no city field of its own (doc06's District has no
 * geography — only its Casas de Paz do). This derives one from the
 * municipalities its Casas de Paz already report, exactly as instructed:
 * a single shared municipality is shown, several distinct ones collapse to
 * "Varios municipios", and no Casas de Paz (or none with a municipality)
 * means there is genuinely nothing to show.
 */
export function deriveDistrictCity(district: DistrictNode): string | null {
  const municipalities = new Set(
    district.peaceHouses
      .map((peaceHouse) => peaceHouse.municipalityName)
      .filter((name) => name !== null),
  );

  if (municipalities.size === 0) {
    return null;
  }
  if (municipalities.size === 1) {
    return [...municipalities][0] ?? null;
  }
  return 'Varios municipios';
}

/**
 * "Cantidad de Líderes" for a district: the district pastor (if assigned)
 * plus every Casa de Paz that has its own leadership assigned. A count over
 * data already in the tree, not a new query.
 */
export function countDistrictLeaders(district: DistrictNode): number {
  const districtPastor = district.leadership ? 1 : 0;
  const peaceHouseLeaders = district.peaceHouses.filter(
    (peaceHouse) => peaceHouse.leadership !== null,
  ).length;
  return districtPastor + peaceHouseLeaders;
}

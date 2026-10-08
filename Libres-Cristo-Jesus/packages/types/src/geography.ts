/**
 * Colombia's geographic envelope — the SINGLE definition of "inside the
 * country".
 *
 * Lives here, not in the backend geocoder, because two different layers
 * need the exact same numbers for two different reasons:
 *
 *  1. THE DATA. The geocoder refuses to store a coordinate outside this
 *     box. Nominatim answers an ambiguous query with a confident match in
 *     another country ("Santa Rosa" resolves to Argentina), and a wrong
 *     coordinate, once written, is indistinguishable from a right one.
 *  2. THE VIEW. The map clamps panning and zooming to this box, so the
 *     user cannot drift off to Panama and lose every marker off-screen.
 *
 * Two copies of these bounds would drift, and the symptom would be absurd:
 * a coordinate the geocoder accepts that the map refuses to show, or a map
 * that pans somewhere the data can never populate.
 *
 * THE PLATFORM IS COLOMBIA-ONLY BY DESIGN. This is not a default to be
 * parameterised later — the geographic catalogues, the DANE codes and the
 * whole organisational model assume one country.
 */

/**
 * Bounding box in decimal degrees.
 *
 * `north` reaches 13.5 and `west` reaches -82.1 to include the Caribbean
 * islands: San Andrés sits at roughly 12.5 N, -81.7 W, well outside the
 * continental landmass. A box drawn around the mainland alone would quietly
 * reject an archipelago that is Colombian territory.
 */
export const COLOMBIA_BOUNDS = {
  south: -4.3,
  west: -82.1,
  north: 13.5,
  east: -66.8,
} as const;

/**
 * Roughly the centre of the country, for the map's initial view.
 *
 * Deliberately not the geometric centre of `COLOMBIA_BOUNDS`: that box is
 * stretched west by San Andrés, so its centre sits in the sea. This is the
 * conventional centroid of the mainland.
 */
export const COLOMBIA_CENTER = { latitude: 4.5709, longitude: -74.2973 } as const;

/**
 * Zoom at which the whole country fits a typical viewport. Also the floor
 * the map enforces: zooming further out would frame neighbouring countries
 * the platform has nothing to say about.
 */
export const COLOMBIA_MIN_ZOOM = 5;

/** Sensible starting zoom — the country, without dead space around it. */
export const COLOMBIA_DEFAULT_ZOOM = 6;

/**
 * True when a coordinate falls inside the country.
 *
 * Used by the geocoder before persisting, and available to any screen that
 * needs to decide whether a stored pin is plottable.
 */
export function isWithinColombia(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= COLOMBIA_BOUNDS.south &&
    latitude <= COLOMBIA_BOUNDS.north &&
    longitude >= COLOMBIA_BOUNDS.west &&
    longitude <= COLOMBIA_BOUNDS.east
  );
}

import { Logger } from '@nestjs/common';
import { NominatimGeocoder } from './nominatim.geocoder';

/**
 * These tests exist for ONE reason above all: `toCoordinates` rejects
 * anything outside Colombia. Nominatim answers a bad query with a confident
 * match somewhere else on Earth, and once a wrong coordinate is a row in a
 * table it is indistinguishable from a right one — the map just quietly
 * places a Casa de Paz in the ocean and nobody can explain why.
 *
 * The rate limiter is exercised too, because exceeding it gets the whole
 * installation blocked by OSM, and that failure only shows up in production.
 */
describe('NominatimGeocoder', () => {
  let geocoder: NominatimGeocoder;
  /**
   * Typed explicitly rather than left as `jest.SpyInstance`: the loose form
   * makes every `mock.calls[...]` read an `any`, which this repo's lint
   * rules reject — correctly, since an assertion against `any` passes
   * whatever the code actually did.
   */
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const hit = (lat: string, lon: string): Response =>
    ({ ok: true, status: 200, json: () => Promise.resolve([{ lat, lon }]) }) as unknown as Response;

  beforeEach(() => {
    geocoder = new NominatimGeocoder();
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves a hit inside Colombia', async () => {
    fetchMock.mockResolvedValue(hit('4.710989', '-74.072092'));

    await expect(geocoder.geocode({ name: 'Bogotá' })).resolves.toEqual({
      latitude: 4.710989,
      longitude: -74.072092,
    });
  });

  it('accepts San Andrés, which sits far outside the continental box', async () => {
    fetchMock.mockResolvedValue(hit('12.583333', '-81.7'));

    await expect(geocoder.geocode({ name: 'San Andrés' })).resolves.toEqual({
      latitude: 12.583333,
      longitude: -81.7,
    });
  });

  it('REJECTS a confident match outside Colombia rather than storing it', async () => {
    // Santa Rosa, Argentina — exactly what Nominatim returns when the
    // country filter is ignored or the name is ambiguous.
    fetchMock.mockResolvedValue(hit('-36.620833', '-64.290278'));

    await expect(geocoder.geocode({ name: 'Santa Rosa' })).resolves.toBeNull();
  });

  it('sends the department as `state` so ambiguous names resolve correctly', async () => {
    fetchMock.mockResolvedValue(hit('4.710989', '-74.072092'));

    await geocoder.geocode({ name: 'Santa Rosa', department: 'Cauca' });

    // `fetch` accepts a Request or URL too, so the type is widened; the
    // adapter always passes a plain string and the assertion says so.
    const url = fetchMock.mock.calls[0]?.[0];
    expect(typeof url).toBe('string');
    expect(url as string).toContain('state=Cauca');
    expect(url as string).toContain('country=co');
  });

  it('identifies itself, as the Nominatim usage policy requires', async () => {
    fetchMock.mockResolvedValue(hit('4.710989', '-74.072092'));

    await geocoder.geocode({ name: 'Bogotá' });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toContain('LCJConnect');
  });

  it('returns null on an empty result set', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    await expect(geocoder.geocode({ name: 'Inexistente' })).resolves.toBeNull();
  });

  it('returns null on a non-numeric payload instead of persisting NaN', async () => {
    fetchMock.mockResolvedValue(hit('no-es-un-numero', '-74.0'));

    await expect(geocoder.geocode({ name: 'Bogotá' })).resolves.toBeNull();
  });

  it('degrades to null on an HTTP error so one bad row cannot abort the run', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 } as unknown as Response);

    await expect(geocoder.geocode({ name: 'Bogotá' })).resolves.toBeNull();
  });

  it('degrades to null when the request throws (timeout, DNS, offline)', async () => {
    fetchMock.mockRejectedValue(new Error('The operation was aborted due to timeout'));

    await expect(geocoder.geocode({ name: 'Bogotá' })).resolves.toBeNull();
  });

  it('waits between consecutive calls so OSM never blocks the installation', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue(hit('4.710989', '-74.072092'));

    await geocoder.geocode({ name: 'Bogotá' });

    let settled = false;
    void geocoder.geocode({ name: 'Medellín' }).then(() => {
      settled = true;
    });

    // Still waiting one second in: the policy cap is one request per second
    // and this one deliberately leaves margin on top of it.
    await jest.advanceTimersByTimeAsync(1_000);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(600);
    expect(settled).toBe(true);

    jest.useRealTimers();
  });
});

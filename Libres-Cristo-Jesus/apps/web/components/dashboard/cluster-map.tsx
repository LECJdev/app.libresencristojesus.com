'use client';

import { useEffect, useRef } from 'react';
import {
  COLOMBIA_BOUNDS,
  COLOMBIA_CENTER,
  COLOMBIA_DEFAULT_ZOOM,
  COLOMBIA_MIN_ZOOM,
  type MapPoint,
} from '@lcj/types';

/**
 * Mapa nacional de Casas de Paz (doc11 RN-1103).
 *
 * ── Why Leaflet + OSM tiles and not Google Maps ──────────────────────
 * RN-1103 forbids depending on external services like Google Maps and
 * requires the map to use only the departments and municipalities already
 * registered. THE DATA IS ENTIRELY OURS: every point comes from
 * `GET /dashboard/map`, which reads coordinates already stored in our
 * database. The tiles are the one external piece — free, key-less
 * background imagery, not information about the church.
 *
 * ── Nothing is geocoded here ─────────────────────────────────────────
 * Positions were resolved ONCE by `pnpm db:geocode:geo`. Geocoding at
 * render time would put a service that allows one call per second — and
 * blocks callers who exceed it — in front of a map a user is watching.
 *
 * ── Colombia only ────────────────────────────────────────────────────
 * `maxBounds` and `minZoom` come from `@lcj/types`, the same constants the
 * backend geocoder validates against. The platform is Colombia-only by
 * design, so panning to Panama is not a view worth offering — and if the
 * two definitions ever disagreed, the symptom would be a coordinate the
 * API accepts that the map refuses to show.
 *
 * ── Client-only ──────────────────────────────────────────────────────
 * Leaflet touches `window` at import time, so this module must never be
 * evaluated on the server. Callers import it through `next/dynamic` with
 * `ssr: false`; the CSS is imported inside the effect for the same reason.
 */

export interface ClusterMapProps {
  points: MapPoint[];
}

/**
 * Read from the stylesheet rather than hardcoded, so the map obeys doc18
 * §28 like everything else. Leaflet builds its markers as raw HTML strings,
 * which cannot inherit a CSS variable — resolving them once at mount is the
 * bridge between the token system and a library that wants literal colours.
 */
function readBrandColors(): { marker: string; markerBorder: string; surface: string } {
  const styles = getComputedStyle(document.documentElement);
  const read = (token: string, fallback: string): string =>
    styles.getPropertyValue(token).trim() || fallback;

  return {
    marker: read('--color-gold-500', '#d4a017'),
    markerBorder: read('--color-primary-900', '#0b3d6d'),
    surface: read('--surface', '#ffffff'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function ClusterMap({ points }: ClusterMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | null = null;

    const setup = async (): Promise<void> => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      await import('leaflet.markercluster/dist/MarkerCluster.css');
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
      await import('leaflet.markercluster');

      // The container may have unmounted while those dynamic imports were
      // in flight — initialising Leaflet into a detached node throws.
      if (cancelled || !containerRef.current) {
        return;
      }

      const colors = readBrandColors();

      const instance = L.map(containerRef.current, {
        center: [COLOMBIA_CENTER.latitude, COLOMBIA_CENTER.longitude],
        zoom: COLOMBIA_DEFAULT_ZOOM,
        minZoom: COLOMBIA_MIN_ZOOM,
        // Locks the viewport to the country. `maxBoundsViscosity: 1` makes
        // the edge solid instead of rubber-banding, which otherwise lets a
        // determined drag leave every marker off-screen.
        maxBounds: L.latLngBounds(
          [COLOMBIA_BOUNDS.south, COLOMBIA_BOUNDS.west],
          [COLOMBIA_BOUNDS.north, COLOMBIA_BOUNDS.east],
        ),
        maxBoundsViscosity: 1,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(instance);

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 55,
        /*
         * The badge counts MARKERS, so it reads "how many Casas de Paz are
         * here" — which is exactly what the design's legend asks for. Each
         * pin's popup then carries how many people that one house gathers.
         */
        iconCreateFunction: (marker) => {
          const count = marker.getChildCount();
          const size = count > 50 ? 56 : count > 20 ? 48 : 40;

          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;background:${colors.marker};
              display:flex;align-items:center;justify-content:center;border-radius:9999px;
              font-weight:700;color:${colors.markerBorder};
              border:2px solid ${colors.surface};box-shadow:0 4px 12px rgba(11,61,109,0.25);"
              >${count}</div>`,
            className: 'lcj-cluster-icon',
            iconSize: [size, size],
          });
        },
      });

      for (const point of points) {
        const marker = L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({
            html: `<div style="width:26px;height:26px;transform:rotate(-45deg);
              background:${colors.marker};border:2px solid ${colors.markerBorder};
              border-radius:50% 50% 50% 0;"></div>`,
            className: 'lcj-point-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 26],
          }),
          // Read out instead of announced as an unlabelled marker.
          alt: point.label,
          keyboard: true,
        });

        marker.bindPopup(buildPopup(point));
        cluster.addLayer(marker);
      }

      instance.addLayer(cluster);
      map = instance;
    };

    void setup();

    return () => {
      cancelled = true;
      // Leaflet keeps listeners on window; without `remove()` a route change
      // leaks them and a second mount throws "Map container is already
      // initialized".
      map?.remove();
    };
  }, [points]);

  return <div ref={containerRef} className="size-full" />;
}

/**
 * Built as a string because that is Leaflet's popup contract. Every value is
 * escaped: a Casa de Paz is named by a user, and its name lands in innerHTML.
 */
function buildPopup(point: MapPoint): string {
  const subLabel = point.subLabel
    ? `<div style="color:#6b7280;font-size:11px;margin-bottom:6px;">${escapeHtml(point.subLabel)}</div>`
    : '';

  const approximate = point.approximate
    ? `<div style="color:#6b7280;font-size:11px;margin-top:4px;">Ubicación aproximada al municipio.</div>`
    : '';

  return `
    <div style="font-family:inherit;min-width:180px;">
      <div style="font-weight:700;font-size:14px;">${escapeHtml(point.label)}</div>
      ${subLabel}
      <div style="font-size:12px;">Personas: <b>${point.count}</b></div>
      ${approximate}
    </div>
  `;
}

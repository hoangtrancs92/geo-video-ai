# API evidence — preliminary, not installed verification

The specification references next documentation. Package exports must be checked against
the actual installed release before accepting the spike.

- [deck.gl v9.1.14 MapboxOverlay source](https://raw.githubusercontent.com/visgl/deck.gl/v9.1.14/modules/mapbox/src/mapbox-overlay.ts)
  was retrieved and inspected. This source exposes interleaved, setProps, finalize and MapLibre-compatible integration.
  The candidate uses this release's `@deck.gl/mapbox`, not an invented `MapLibreOverlay` export.
- [MapLibre v5.6.1 manifest](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/v5.6.1/package.json)
  was retrieved, confirming package version and type declaration entry.
- [Current/next MapLibreOverlay documentation](https://deck.gl/next/docs/api-reference/maplibre/overview)
  describes a separate `@deck.gl/maplibre` package. It must not be assumed available in deck.gl 9.1.14.
- [Remotion renderMedia documentation](https://www.remotion.dev/docs/renderer/render-media)
  was retrieved. No Remotion package has been installed or validated; no runtime conclusion is drawn.

Outstanding installed API checks: MapLibre canvasContextAttributes and render events,
GeoJsonLayer props, deck onAfterRender interleaving, Playwright launch/screenshot options,
Vite serving and TypeScript browser compilation. The camera unit tests run with Node's native
TypeScript stripping; they do not typecheck browser integration.

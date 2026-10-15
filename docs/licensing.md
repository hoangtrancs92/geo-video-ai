# Licensing status

Spike polygons are original synthetic rectangles dedicated to CC0-1.0. They are not country
boundaries, surveyed coordinates, or statistical data. The visible footer explicitly labels them.
No remote tiles, private credentials, commercial fonts, or claimed factual country statistics
are used by the spike.

The current JPN/CHN demo uses a local Natural Earth 1:110m subset. The pinned
SHA-256, source ID, license, and required attribution are in `assets/registry.json`;
the source URL, raw/normalized checksums, retrieval time and boundary caveat are
in `assets/geodata/natural-earth-jpn-chn.manifest.json`. The render and validate
CLIs verify the registered map bytes before use. The renderer now sets the
document locale and uses installed system font fallbacks for Japanese and
Vietnamese sample text. No font binaries are bundled. Actual glyph coverage
and visual quality on the target browser remain unverified; font redistribution
rights must be reviewed before bundling a deterministic local font.

The stylized globe proof uses a normalized 177-feature world layer derived
from the same pinned local Natural Earth source. Its checksum and provenance
are recorded in `assets/registry.json` and
`assets/geodata/natural-earth-world.manifest.json`. It does not use satellite
imagery or remote map tiles.

MapLibre's inspected manifest declares BSD-3-Clause; deck.gl's inspected source declares MIT.
Full dependency license inventory requires successful installation. Remotion license review is
pending because that integration is not installed. FFmpeg found on this machine reports a GPL
build; it is used as an external local executable and is not bundled with this repository.

The original M1 A-C-D synthetic fixture uses
`assets/geodata/synthetic-regions.geojson`, original rectangles released under
CC0-1.0. The renderer requires visible `attributionText` for each local GeoJSON
project. The real JPN/CHN map is a separate example and has browser samples.

The Natural Earth JPN/CHN source is present locally. Its original bytes and
normalized subset match the SHA-256 values in
`assets/geodata/natural-earth-jpn-chn.manifest.json`. Source retrieval timestamp,
license URL, and boundary caveat are recorded there. Cartographic accuracy and
political interpretation have not been editorially approved. Re-importing data
that changes the normalized checksum requires a deliberate registry update before
the new asset can be rendered.

import {createHash} from 'node:crypto';

// Scan the map crop, not the title/attribution, so typography cannot conceal a black map.
export function inspectPixels({data, width, height}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || data.length !== width * height * 4) {
    throw new Error('Invalid RGBA image');
  }
  let black = 0, cyan = 0, pink = 0, count = 0;
  for (let y = Math.floor(height * .2); y < Math.ceil(height * .8); y++) {
    for (let x = Math.floor(width * .1); x < Math.ceil(width * .9); x++) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = data.subarray(i, i + 4);
      count++;
      if (a < 250 || Math.max(r, g, b) < 12) black++;
      if (r < 110 && g > 130 && b > 150) cyan++;
      // Extruded faces can be shaded: identify the rose hue by channel ratios
      // instead of assuming the unshaded accessor's absolute red intensity.
      // Keep a brightness floor and reject white/gray, orange, cyan and navy.
      if (a >= 250 && r >= 90 && b >= 35 && r > 2 * g && r > 1.5 * b && b > 1.2 * g) pink++;
    }
  }
  return {hash: createHash('sha256').update(data).digest('hex'), blackFraction: black / count,
    cyanFraction: cyan / count, pinkFraction: pink / count};
}
export function assertMapPixels(stats) {
  if (stats.blackFraction > .95) throw new Error('BLACK_FRAME');
  if (stats.cyanFraction < .0002 || stats.pinkFraction < .0002) throw new Error('MISSING_MAP_OR_DECK_OVERLAY');
}

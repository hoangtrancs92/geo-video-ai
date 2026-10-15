export interface Camera {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}
export function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
}
export function wrap(x: number): number { return ((x + 180) % 360 + 360) % 360 - 180; }
export function cameraAtFrame(a: Camera, b: Camera, frame: number, total: number): Camera {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(frame) || frame < 0 || frame >= total) {
    throw new Error('Frame outside timeline');
  }
  const t = ease(frame / Math.max(1, total - 1));
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    center: [wrap(a.center[0] + wrap(b.center[0] - a.center[0]) * t), lerp(a.center[1], b.center[1])],
    zoom: lerp(a.zoom, b.zoom), pitch: lerp(a.pitch, b.pitch),
    bearing: wrap(a.bearing + wrap(b.bearing - a.bearing) * t)
  };
}

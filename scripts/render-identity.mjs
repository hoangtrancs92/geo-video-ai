import {fileHash, objectHash} from './chunks.mjs';

// Include every input to the synthetic scene, not only the browser version.
export async function renderIdentity(root, preflight, chromium, webgl, backend) {
  const sources = {};
  for (const file of ['spike/main.ts', 'spike/state.ts', 'spike/camera.ts',
    'spike/frame-ready.ts', 'spike/index.html', 'scripts/browser-options.mjs',
    'scripts/pixels.mjs', 'package-lock.json']) {
    sources[file] = await fileHash(new URL(file, root));
  }
  const config = {version: 1, sources, node: process.version, chromium,
    renderer: webgl.renderer, backend, width: 1080, height: 1920, fps: 30,
    ffmpeg: preflight.checks.ffmpeg.detail, ffprobe: preflight.checks.ffprobe.detail};
  return {config, identity: objectHash(config)};
}

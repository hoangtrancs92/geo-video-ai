import {cameraAtFrame} from './camera.ts';

export function spikeState(frame: number, workload: 'm0' | 'scale' = 'm0') {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error('INVALID_FRAME');
  // Scale workload is synthetic repeated motion for stress testing, not editorial content.
  // Every frame is rendered; no repeated PNG/video segments are substituted.
  const phase = frame % 1198;
  const local = workload === 'm0' ? frame : phase <= 599 ? phase : 1198 - phase;
  const total = workload === 'm0' ? 100 : 600;
  return {
    camera: cameraAtFrame({center:[124,35],zoom:4,pitch:20,bearing:-12},
      {center:[125,35.5],zoom:4.5,pitch:48,bearing:12},local,total),
    elevation: workload === 'm0' ? 10000 + frame * 500 : 10000 + local / (total - 1) * 49500
  };
}

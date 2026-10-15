import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {browserEngine,browserOptions} from './browser-options.mjs';
const require = createRequire(import.meta.url);
export function commandCheck(command, args = ['--version']) {
  const r = spawnSync(command,args,{encoding:'utf8',timeout:10000});
  return {ok:!r.error && r.status===0,detail:r.error?.message || (r.stdout || r.stderr || '').split('\n')[0]};
}
export function preflight() {
  const engine=browserEngine();
  browserOptions();
  const checks = {
    node:{ok:process.version==='v24.13.1',detail:process.version},
    ffmpeg:commandCheck(process.env.FFMPEG_PATH || 'ffmpeg',['-version']),
    ffprobe:commandCheck(process.env.FFPROBE_PATH || 'ffprobe',['-version'])
  };
  for (const name of ['vite','playwright','pngjs','maplibre-gl','@deck.gl/core','@deck.gl/layers','@deck.gl/mapbox']) {
    try { checks[name]={ok:true,detail:require.resolve(name)}; }
    catch {checks[name]={ok:false,detail:'DEPENDENCY_NOT_INSTALLED'};}
  }
  if (engine==='chromium'&&process.env.CHROME_PATH) checks.chrome={ok:existsSync(process.env.CHROME_PATH),detail:process.env.CHROME_PATH};
  if (engine==='webkit') {
    const executable=require('playwright').webkit.executablePath();
    checks.webkit={ok:existsSync(executable),detail:executable};
  }
  return {status:Object.values(checks).every(c=>c.ok)?'ready-for-browser-probe':'blocked',checks,
    note:'This checks prerequisites only. WebGL2, fonts, rendering and codecs require the real spike.'};
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const report=preflight();
  mkdirSync('outputs',{recursive:true});
  writeFileSync('outputs/preflight.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  process.exitCode=report.status==='blocked'?1:0;
}

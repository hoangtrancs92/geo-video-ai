export function browserEngine(env=process.env) {
  const engine=env.BROWSER_ENGINE || 'chromium';
  if(!['chromium','webkit'].includes(engine)) throw new Error(`INVALID_BROWSER_ENGINE:${engine}`);
  return engine;
}

export function browserOptions(env=process.env) {
  const engine=browserEngine(env);
  const backend=env.WEBGL_BACKEND || 'default';
  if(!['default','swiftshader'].includes(backend)) throw new Error(`INVALID_WEBGL_BACKEND:${backend}`);
  if(engine==='webkit') {
    if(backend!=='default') throw new Error('WEBKIT_REQUIRES_DEFAULT_WEBGL_BACKEND');
    if(env.CHROME_PATH) throw new Error('CHROME_PATH_ONLY_FOR_CHROMIUM');
    return {headless:true,timeout:30000};
  }
  return {headless:true,chromiumSandbox:true,timeout:30000,
    ...(env.CHROME_PATH?{executablePath:env.CHROME_PATH}:{}),
    // Explicit CPU driver selection; no automatic or silent fallback.
    ...(backend==='swiftshader'?{args:['--use-gl=angle','--use-angle=swiftshader']}:{} )};
}

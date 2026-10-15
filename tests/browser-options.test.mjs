import test from 'node:test';
import assert from 'node:assert/strict';
import {browserEngine,browserOptions} from '../scripts/browser-options.mjs';
test('software renderer is explicit and retains Chromium sandbox',()=>{
  assert.equal(browserOptions({}).args,undefined);
  const options=browserOptions({WEBGL_BACKEND:'swiftshader',CHROME_PATH:'/browser'});
  assert.deepEqual(options.args,['--use-gl=angle','--use-angle=swiftshader']);
  assert.equal(options.chromiumSandbox,true);
  assert.equal(options.executablePath,'/browser');
  assert.throws(()=>browserOptions({WEBGL_BACKEND:'unknown'}),/INVALID_WEBGL_BACKEND/);
});
test('WebKit uses its own launch options and rejects Chromium flags',()=>{
  assert.equal(browserEngine({BROWSER_ENGINE:'webkit'}),'webkit');
  assert.deepEqual(browserOptions({BROWSER_ENGINE:'webkit'}),{headless:true,timeout:30000});
  assert.throws(()=>browserOptions({BROWSER_ENGINE:'webkit',WEBGL_BACKEND:'swiftshader'}),/WEBKIT_REQUIRES_DEFAULT/);
  assert.throws(()=>browserOptions({BROWSER_ENGINE:'webkit',CHROME_PATH:'/browser'}),/CHROME_PATH_ONLY/);
  assert.throws(()=>browserEngine({BROWSER_ENGINE:'safari'}),/INVALID_BROWSER_ENGINE/);
});

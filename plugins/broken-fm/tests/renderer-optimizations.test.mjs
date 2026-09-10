import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rendererSource = await readFile(new URL('../js/renderer.js', import.meta.url), 'utf8');
const rendererModule = await import(`data:text/javascript;base64,${Buffer.from(rendererSource).toString('base64')}`);
const companionSource = await readFile(new URL('../js/companion-adapter.js', import.meta.url), 'utf8');
const companionModule = await import(`data:text/javascript;base64,${Buffer.from(companionSource).toString('base64')}`);

test('uniform locations are cached before frame rendering', () => {
  const calls = [];
  const writes = [];
  const gl = {
    getUniformLocation(_program, name) { calls.push(name); return name === 'uUnused' ? null : { name }; },
    uniform1f(location, value) { writes.push([location.name, value]); },
  };
  const program = {};
  rendererModule.cacheUniformLocations(gl, program,
    'uniform float uUsed; uniform float uUsed;', 'uniform sampler2D uUnused;');
  assert.deepEqual(calls, ['uUsed', 'uUnused']);

  const renderer = new rendererModule.BrokenFmRenderer({}, () => {});
  renderer.gl = gl;
  renderer.setUniform(program, 'uUsed', '1f', 3.5);
  renderer.setUniform(program, 'uUnused', '1f', 2);
  renderer.setUniform(program, 'uUnknown', '1f', 1);
  assert.deepEqual(calls, ['uUsed', 'uUnused']);
  assert.deepEqual(writes, [['uUsed', 3.5]]);
});

test('GLSL hash implementations remain identical', async () => {
  const signal = await readFile(new URL('../shaders/signal.frag', import.meta.url), 'utf8');
  const seed = await readFile(new URL('../shaders/fm-seed.frag', import.meta.url), 'utf8');
  const hash = (source) => source.match(/float hash21\(vec2 p\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(hash(signal));
  assert.equal(hash(signal), hash(seed));
});

test('expensive signal variants stay behind uniform branches', async () => {
  const signal = await readFile(new URL('../shaders/signal.frag', import.meta.url), 'utf8');
  const colorBranch = signal.indexOf('if (uColorMode == 2)');
  assert.ok(colorBranch > 0);
  assert.ok(signal.indexOf('modulatedPhase + rgbOffset', colorBranch) > colorBranch);
  assert.match(signal, /if \(uViewMode == 5\).*lineFromPhase\(unstableCarrierPhase\)/);
  assert.match(signal, /if \(uViewMode == 6\).*carrierWave\(unstableCarrierPhase/);
});

test('photosensitivity warning gates the first renderer frame', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const gate = await readFile(new URL('../js/warning-gate.js', import.meta.url), 'utf8');
  assert.ok(index.indexOf('id="photosensitivity-warning"') < index.indexOf('id="preview"'));
  assert.ok(index.indexOf('js/warning-gate.js') < index.indexOf('css/style.css'));
  assert.match(index, /id="icon-warning"[\s\S]*M1 21h22L12 2 1 21/);
  assert.match(index, /role="alertdialog" aria-modal="true"/);
  assert.match(gate, /localStorage\.getItem\(storageKey\)/);
  assert.equal((app.match(/renderer\.initialize\(\)/g) ?? []).length, 1);
  assert.match(app, /async function startApplication\(\) \{\s*await renderer\.initialize\(\)/);
  assert.match(app, /waitForPhotosensitivityAcknowledgement\(\)\.then\(startApplication\)/);
});

test('README and OFX architecture describe the current renderer and install path', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const architecture = await readFile(new URL('../docs/ofx-architecture.md', import.meta.url), 'utf8');
  const build = await readFile(new URL('../scripts/build-windows.ps1', import.meta.url), 'utf8');
  const userInstall = await readFile(new URL('../scripts/install-windows-user.ps1', import.meta.url), 'utf8');
  const manualGenerator = await readFile(new URL('../tools/generate-user-manual.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(readme, /fixed 32-sample numerical line integral/);
  assert.match(readme, /photosensitivity warning/);
  assert.match(readme, /CUB segmented inclusive scan/);
  assert.match(readme, /CudaRenderContext/);
  assert.match(readme, /install-windows-user\.ps1/);
  assert.match(architecture, /cudaMemcpy2DAsync/);
  assert.match(architecture, /positive and negative `row_bytes`/);
  assert.match(architecture, /shared frozen parameter contract/);
  assert.match(build, /Visual Studio 17 2022/);
  assert.match(userInstall, /OFX_PLUGIN_PATH/);
  assert.match(userInstall, /CompanionPath/);
  assert.match(manualGenerator, /Photosensitivity warning/);
  assert.match(manualGenerator, /shared Resolve enum and matrix controls may still expose/);
});

test('web and staged Companion frontends have explicit runtime identities', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');
  const staging = await readFile(new URL('../companion/scripts/stage_frontend.mjs', import.meta.url), 'utf8');
  const fakeDocument = (companion) => ({
    querySelector(selector) {
      assert.equal(selector, 'meta[name="broken-fm-runtime"][content="companion"]');
      return companion ? {} : null;
    },
  });

  assert.equal(companionModule.isCompanionRuntime(fakeDocument(false)), false);
  assert.equal(companionModule.isCompanionRuntime(fakeDocument(true)), true);
  assert.doesNotMatch(index, /name="broken-fm-runtime"/);
  assert.match(staging, /name=\\?"broken-fm-runtime\\?" content=\\?"companion\\?"/);
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
});

test('OFX group identifiers cannot collide with public parameter identifiers', async () => {
  const contract = JSON.parse(await readFile(new URL('../contracts/parameters-v1.json', import.meta.url), 'utf8'));
  const ofx = await readFile(new URL('../hosts/ofx/src/broken_fm_ofx.cpp', import.meta.url), 'utf8');
  const parameterIds = new Set(contract.parameters.map((parameter) => parameter.id));
  const groupIds = new Set(contract.parameters.map((parameter) => `brokenFmGroup_${parameter.group}`));

  assert.deepEqual([...groupIds].filter((groupId) => parameterIds.has(groupId)), []);
  assert.match(ofx, /paramDefine\(set, kOfxParamTypeGroup, groupId\.c_str\(\), &group\)/);
  assert.match(ofx, /propSetString\(param, kOfxParamPropParent, 0, groupId\.c_str\(\)\)/);
});

test('Companion CSP permits fetching its embedded shaders and presets', async () => {
  const config = JSON.parse(await readFile(new URL('../companion/src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
  const connectSources = config.app.security.csp['connect-src'].split(/\s+/);

  assert.ok(connectSources.includes("'self'"));
  assert.ok(connectSources.includes('ipc:'));
  assert.ok(connectSources.includes('http://ipc.localhost'));
});

test('release Companion launches without a console window', async () => {
  const main = await readFile(new URL('../companion/src-tauri/src/main.rs', import.meta.url), 'utf8');
  assert.match(main, /^#!\[cfg_attr\(not\(debug_assertions\), windows_subsystem = "windows"\)\]/);
});

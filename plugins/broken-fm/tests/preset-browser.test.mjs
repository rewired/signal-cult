import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../js/renderer.js', import.meta.url), 'utf8');

test('preset browser uses an isolated bounded renderer and applies selected looks', () => {
  assert.match(html, /id="open-preset-browser"/);
  assert.match(html, /id="preset-browser-dialog"/);
  assert.match(html, /id="preset-grid"/);
  assert.match(app, /new BrokenFmRenderer\(thumbnailCanvas, showError\)/);
  assert.match(app, /presetPreviewRenderer\.setRenderSize\(320, 180\)/);
  assert.match(app, /applyAndResetPreset\(preset, 'preset\.applied'\)/);
  assert.match(renderer, /setRenderSize\(width, height\)/);
  assert.match(renderer, /this\.renderSize\?\.\[0\]/);
});

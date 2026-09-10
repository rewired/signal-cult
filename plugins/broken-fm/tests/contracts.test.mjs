import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PRESET_FIELDS, PRESET_VERSION, parsePreset } from '../js/presets.js';

const contract = JSON.parse(fs.readFileSync(new URL('../contracts/parameters-v1.json', import.meta.url)));

test('frozen contract matches the browser preset schema', () => {
  assert.equal(contract.schema, 'broken-fm/parameter-contract');
  assert.equal(contract.preset_schema_version, PRESET_VERSION);
  assert.deepEqual(contract.parameters.map(({ id }) => id), PRESET_FIELDS.map(({ key }) => key));
  assert.equal(new Set(contract.parameters.map(({ id }) => id)).size, PRESET_FIELDS.length);
});

test('all factory presets satisfy the frozen schema', () => {
  const directory = new URL('../presets/', import.meta.url);
  const files = fs.readdirSync(directory).filter((name) => name !== 'index.json' && name.endsWith('.json'));
  const manifest = JSON.parse(fs.readFileSync(new URL('index.json', directory)));
  assert.equal(files.length, 56);
  assert.equal(manifest.length, files.length);
  for (const file of files) assert.doesNotThrow(() => parsePreset(fs.readFileSync(new URL(file, directory))));
});

test('generated native descriptor stays in lockstep', () => {
  const header = fs.readFileSync(new URL('../native/include/broken_fm/parameters.generated.hpp', import.meta.url), 'utf8');
  assert.match(header, new RegExp(`ParameterDescriptor, ${PRESET_FIELDS.length}>`));
  for (const field of PRESET_FIELDS) assert.ok(header.includes(`"${field.key}"`), `native descriptor missing ${field.key}`);
});

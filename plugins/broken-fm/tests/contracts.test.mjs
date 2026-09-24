import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PRESET_FIELDS, PRESET_VERSION, describePreset, parsePreset, rendererParametersForPreset } from '../js/presets.js';

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

test('factory presets map to native renderer values for thumbnail previews', () => {
  const directory = new URL('../presets/', import.meta.url);
  const files = fs.readdirSync(directory).filter((name) => name !== 'index.json' && name.endsWith('.json'));
  for (const file of files) {
    const preset = parsePreset(fs.readFileSync(new URL(file, directory), 'utf8'));
    const parameters = rendererParametersForPreset(preset);
    assert.equal(Object.keys(parameters).length, PRESET_FIELDS.length);
    assert.match(describePreset(preset), /^(PM|FM) · /);
    for (const field of PRESET_FIELDS.filter(({ type }) => type === 'enum')) {
      assert.ok(Number.isInteger(parameters[field.key]));
      assert.ok(parameters[field.key] >= 0 && parameters[field.key] < field.values.length);
    }
  }
  const preset56 = parsePreset(fs.readFileSync(new URL('56-effective-matrix-lab.json', directory), 'utf8'));
  assert.equal(rendererParametersForPreset(preset56).audioDestination2, 20);
});

test('generated native descriptor stays in lockstep', () => {
  const header = fs.readFileSync(new URL('../native/include/broken_fm/parameters.generated.hpp', import.meta.url), 'utf8');
  assert.match(header, new RegExp(`ParameterDescriptor, ${PRESET_FIELDS.length}>`));
  for (const field of PRESET_FIELDS) assert.ok(header.includes(`"${field.key}"`), `native descriptor missing ${field.key}`);
});

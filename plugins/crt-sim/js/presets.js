import {validatePreset, validateMaskType} from '../lib/crt-params.js';

export function parsePreset(text) {
  const data = JSON.parse(text);
  const params = validatePreset(data);
  const maskType = validateMaskType(data.maskType);
  const name = typeof data.name === 'string' && data.name.trim()
    ? data.name.trim().slice(0, 80) : 'Untitled';
  return {version: 1, name, maskType, params};
}

export function stringifyPreset(preset) {
  return JSON.stringify(parsePreset(JSON.stringify(preset)), null, 2) + '\n';
}

export function stepPresetName(names, current, direction) {
  if (!names.length) return null;
  const index = names.indexOf(current);
  return names[index < 0 ? (direction < 0 ? names.length - 1 : 0)
    : (index + direction + names.length) % names.length];
}

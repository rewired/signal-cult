import fs from 'node:fs';
import path from 'node:path';

const companion = path.resolve(import.meta.dirname, '..');
const root = path.resolve(companion, '..');
const destination = path.join(root, 'dist', 'build', 'windows-x64', 'frontend');
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'shaders', 'presets']) {
  fs.cpSync(path.join(root, entry), path.join(destination, entry), { recursive: true });
}

const stagedIndex = path.join(destination, 'index.html');
const companionMarker = '  <meta name="broken-fm-runtime" content="companion">';
const stagedHtml = fs.readFileSync(stagedIndex, 'utf8');
if (!stagedHtml.includes(companionMarker)) {
  fs.writeFileSync(stagedIndex, stagedHtml.replace('<head>', `<head>\n${companionMarker}`));
}
console.log('Staged BROKEN FM frontend for Tauri.');

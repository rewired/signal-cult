import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'../..');
execFileSync(process.execPath,[path.join(root,'tools/generate-native-contract.mjs')],{stdio:'inherit'});
const destination=path.join(root,'dist/build/windows-x64/frontend');
if(!destination.startsWith(root+path.sep))throw new Error('Staging path outside GRID ROT');
fs.rmSync(destination,{recursive:true,force:true});
fs.mkdirSync(destination,{recursive:true});
for(const entry of ['index.html','style.css','favicon.svg','js','vendor'])
 fs.cpSync(path.join(root,entry),path.join(destination,entry),{recursive:true});
fs.copyFileSync(path.resolve(root,'../broken-fm/js/controls.js'),path.join(destination,'js/controls.js'));
const app=path.join(destination,'js/app.js');
fs.writeFileSync(app,fs.readFileSync(app,'utf8').replace("../../broken-fm/js/controls.js","./controls.js"));
const familyRoot = path.resolve(root, '..');
fs.copyFileSync(path.join(familyRoot,'signal-rot/js/params.js'),path.join(destination,'js/signal-rot-params.js'));
const params=path.join(destination,'js/params.js');
fs.writeFileSync(params,fs.readFileSync(params,'utf8')
 .replace("../../signal-rot/js/params.js","./signal-rot-params.js"));
fs.copyFileSync(path.join(familyRoot,'broken-fm/css/style.css'),path.join(destination,'broken-fm-base.css'));
const inheritedStyle=fs.readFileSync(path.join(familyRoot,'signal-rot/style.css'),'utf8')
 .replace("@import '../broken-fm/css/style.css';","@import './broken-fm-base.css';");
fs.writeFileSync(path.join(destination,'signal-rot-style.css'),inheritedStyle);
const localStyle=path.join(destination,'style.css');
fs.writeFileSync(localStyle,fs.readFileSync(localStyle,'utf8')
 .replace("@import '../signal-rot/style.css';","@import './signal-rot-style.css';"));
for (const asset of ['signal-cult-shell.css', 'signal-cult-signet.svg']) fs.copyFileSync(path.join(familyRoot, asset), path.join(destination, asset));
const index=path.join(destination,'index.html');
fs.writeFileSync(index,fs.readFileSync(index,'utf8').replaceAll('../signal-cult-', 'signal-cult-').replace('<head>','<head>\n<meta name="grid-rot-runtime" content="companion">'));
console.log('Staged GRID ROT frontend for Tauri.');

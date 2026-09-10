import fs from 'node:fs';
const master=new URL('../../broken-fm/',import.meta.url);
const destination=new URL('../',import.meta.url);
for(const [from,to] of [['css/style.css','css/master.css'],['js/controls.js','js/master-controls.js']]) {
 fs.mkdirSync(new URL(to.split('/')[0]+'/',destination),{recursive:true});
 fs.copyFileSync(new URL(from,master),new URL(to,destination));
}

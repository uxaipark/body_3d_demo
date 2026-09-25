import {existsSync,readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const excluded=['app/simulators/wrist','app/research','app/manual','app/documents','app/creator-profile.tsx','lib/wrist','public/simulators','public/research','public/manual','public/thumbnails/wrist.jpg','.openai/hosting.json'];
for(const path of excluded)assert.equal(existsSync(path),false,`Private content present: ${path}`);
const blocked=/\/simulators\/wrist|\/simulators\/radial|\/research(?:[/'"]|$)|\/manual(?:[/'"]|$)|\/documents(?:[/'"]|$)|ABOUT THE CREATOR|park-sung-jin|linkedin\.com\/in|박성진/;
for(const root of ['app','lib','locales','public'])for(const file of readdirSync(root,{recursive:true})){
 if(!/\.(tsx?|js|json|html|md)$/.test(file))continue;
 const path=`${root}/${file}`;assert.equal(blocked.test(readFileSync(path,'utf8')),false,`Private reference: ${path}`);
}
console.log('Public edition audit passed: whole-body, sleep and hand sensing; private patch pipeline excluded.');

// Capture actual 3D models for the public portal. Run with the demo server on port 3011.
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
const profile=await mkdtemp(join(tmpdir(),'soma-body-profile-'));
const executable=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome=spawn(executable,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--window-size=1100,1000','about:blank'],{stdio:['ignore','ignore','pipe']});
let ws;
try{
 const endpoint=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Chrome startup timeout')),20000);chrome.on('error',reject);chrome.stderr.on('data',b=>{text+=b;const m=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timeout);resolve(m[1])}})});
 const targets=await (await fetch(`http://${new URL(endpoint).host}/json/list`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.on('open',r));let id=0;const pending=new Map();ws.on('message',raw=>{const data=JSON.parse(raw);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(data.error):p.resolve(data.result)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1400,height:1000,deviceScaleFactor:2,mobile:false});const errors=[];ws.on('message',raw=>{const data=JSON.parse(raw);if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text+': '+data.params.exceptionDetails.exception?.description)});
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 await send('Network.setCookie',{name:'soma_language',value:process.env.SOMA_LANGUAGE||'ko',url:process.env.SOMA_TEST_URL||'http://localhost:3011',path:'/'});
 await mkdir('outputs/design',{recursive:true});
 for(const [name,route,selector] of [['sleep','/simulators/sleep','.sleep-anatomy'],['hand','/simulators/hand','.ring-view:not(.patient-view)']]){
 await send('Page.navigate',{url:(process.env.SOMA_TEST_URL||'http://localhost:3011')+route});
 for(let i=0;i<150;i++){if(await evaluate(`!!document.querySelector('${selector} canvas') && !document.querySelector('.sleep-loading,.ring-loading')`))break;await delay(200);if(i===149)throw Error('Anatomy load timeout');}
 await evaluate(`(()=>{const host=document.querySelector('${selector}');host.style.cssText='position:fixed;inset:0;width:800px;height:500px;z-index:9999';for(const child of host.children)if(child.tagName!=='CANVAS')child.style.display='none';})()`);
 if(name==='sleep')await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('패치 확대')).click()`);
 await delay(2000);
 const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:92,clip:{x:0,y:0,width:800,height:500,scale:1}});
 await writeFile('public/thumbnails/'+name+'.jpg',Buffer.from(shot.data,'base64'));console.log(name+' captured');
 }
}finally{ws?.close();chrome.kill();await new Promise(r=>chrome.once('exit',r));await rm(profile,{recursive:true,force:true})}

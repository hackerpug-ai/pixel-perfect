import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { main as renderFrames } from '../plugins/pixel-perfect/scripts/render-frames.mjs';
import { digest, jsonDigest, reconcileFrames, validateFrameIndex, validateReferenceInventory } from '../plugins/pixel-perfect/scripts/reference-revisions.mjs';
import { acceptRefresh, applyRefresh, captureRefresh, checkRefresh, completeRefresh, fileSnapshot, judgeRefresh, loadRun, reconcileEdits, resumeRefresh, stageRefresh, verifyRefresh } from '../plugins/pixel-perfect/scripts/refresh-run.mjs';
import { startStaticServer } from '../plugins/pixel-perfect/scripts/chrome.mjs';
import { mergeInventories } from '../plugins/pixel-perfect/scripts/merge-inventory.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins/pixel-perfect/scripts');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const write = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2)+'\n');

async function project() {
  const root = mkdtempSync(path.join(tmpdir(), 'pp-refresh-test-'));
  cpSync(path.join(ROOT, 'test/fixtures/refresh-app'), path.join(root, 'app'), { recursive: true });
  cpSync(path.join(root, 'app'), path.join(root, 'exports'), { recursive: true });
  mkdirSync(path.join(root, 'design'));
  const source = path.join(root, 'exports/index.html');
  const render = { width: 640, mobileWidth: 390, settleMs: 1000 };
  assert.equal(await renderFrames([source, '--out', path.join(root, 'design/reference'), '--width', '640', '--mobile-width', '390', '--settle', '1000']), 0);
  const index = read(path.join(root, 'design/reference/frames.json'));
  const inventory = { version: 1, status: 'complete', sources: index.sources.map(({status, ...s})=>s), frames: index.frames.map(({index: n, width, height, ...f})=>({...f,png:`design/reference/${f.png}`,shows:['Button','Home']})), atoms: [{name:'Button', states:['default'], appears_on:index.frames.map(f=>f.id), evidence:'Drawn button in all states'}], molecules:[], organisms:[], screens:[{name:'Home',route:'/', states:[{name:'default',frames:index.frames.map(f=>f.id)}],composes:['Button'],evidence:'Drawn Home screen'}] };
  write(path.join(root, 'design/inventory.json'), inventory);
  write(path.join(root, 'design/manifest.json'), {version:'8.0.0',platforms:{web:{tools:{framework:'vite'},capture:{command:'node app/check.mjs'},atoms:[{name:'Button',status:'verified'}],screens:[{name:'Home',status:'verified'},{name:'Unrelated',status:'verified'}]},ios:{tools:{framework:'expo',style:'nativewind',components:'react-native-reusables'},phase:'compose'}}});
  const server = await startStaticServer(path.join(root, 'app'));
  const url = `http://127.0.0.1:${server.port}/index.html`;
  const request = { id:'refresh-test', sources:[source], platform:'web', implementationRoots:['app'], render };
  return {root,source,index,inventory,request,url,server};
}
function planFor(run, index, url) {
  return {version:1, items:['Button','Home'].map((name,i)=>({id:name,name,layer:i?'screens':'atoms',classification:'visual-update',files:i?['app/index.html']:['app/theme.css','app/locked/new.css'],dependsOn:i?['Button']:[],states:index.frames.map(f=>({name:'default',frame:f.id,viewport:f.viewport,theme:'light',medium:'browser',capture:[process.execPath,path.join(PLUGIN,'capture-refresh-browser.mjs'),url,'{output}',...f.viewport.split('x'),'light','[data-screen]']})),checks:{regression:[[process.execPath,'--check','app/check.mjs']],behavior:[[process.execPath,path.join(ROOT,'test/fixtures/refresh-app/check.mjs'),url]]}}))};
}
async function evidence(root,id,item) {
  await captureRefresh(root,id,item.id,'after');
  await judgeRefresh(root,id,item.id,item.states.map(s=>({frame:s.frame,reviewer:'test operator',reason:'Test records explicit judgment to exercise freshness gates; application acceptance remains deferred.',verdict:'pass',discrepancies:[]})));
  await checkRefresh(root,id,item.id);
}

test('refresh: asset-only revision, accepted scope, actual captures/checks, resume, stale evidence and unchanged rerun', {timeout:180000}, async()=>{
  const p=await project(); const {root,request,source}=p;
  try {
    const manifestBefore=read(path.join(root,'design/manifest.json'));
    const oldHash=p.index.sources[0].hash;
    writeFileSync(path.join(root,'exports/theme.css'),readFileSync(path.join(root,'exports/theme.css'),'utf8').replace('2px','14px'));
    const originalFiles=fileSnapshot(root,['design/reference','design/inventory.json','app']);
    const run=await stageRefresh(root,request);
    const next=read(path.join(root,'design/refresh',run.id,'staged/frames.json'));
    assert.equal(next.sources[0].hash,oldHash,'entry HTML did not change');
    assert.notEqual(next.sources[0].revision,p.index.sources[0].revision,'CSS changed rendered revision');
    assert.ok(next.sources[0].inputs.some(i=>i.file.endsWith('theme.css')));
    assert.deepEqual(fileSnapshot(root,['design/reference','design/inventory.json','app']),originalFiles,'stage leaves active state intact');
    assert.equal(run.reconciliation.conflicts.length,0);
    const plan=planFor(run,next,p.url);
    const bad=structuredClone(plan);bad.items.shift();bad.items[0].dependsOn=[];
    await assert.rejects(acceptRefresh(root,run.id,bad),/omits affected entity/);
    await acceptRefresh(root,run.id,plan);
    const current=read(path.join(root,'design/manifest.json'));
    assert.equal(current.platforms.web.atoms[0].status,'pending');
    assert.equal(current.inventory.refresh_run,run.id);
    assert.equal(read(path.join(root,'design/inventory.json')).confirmed,current.inventory.confirmed);
    assert.equal(current.inventory.sources[0].revision,next.sources[0].revision);
    assert.equal(current.platforms.web.screens[1].status,'verified');
    assert.deepEqual(current.platforms.ios,manifestBefore.platforms.ios);
    assert.equal((await verifyRefresh(root,run.id)).complete,false);
    await assert.rejects(completeRefresh(root,run.id),/incomplete/);
    for (const item of plan.items) await captureRefresh(root,run.id,item.id,'before');
    const patch=path.join(root,'patch');mkdirSync(path.join(patch,'app'),{recursive:true});cpSync(path.join(root,'exports/theme.css'),path.join(patch,'app/theme.css'));
    writeFileSync(path.join(root,'app/index.html'),readFileSync(path.join(root,'app/index.html'),'utf8')+'\n<!-- outside edit -->');
    await assert.rejects(applyRefresh(root,run.id,'Button',patch),/Outside edits/);
    await reconcileEdits(root,run.id,{planHash:loadRun(root,run.id).accepted.planHash,reason:'Keep the external comment after reviewing its diff.',files:[{path:'app/index.html',hash:digest(readFileSync(path.join(root,'app/index.html')))}]});
    assert.match(readFileSync(path.join(root,'app/index.html'),'utf8'),/outside edit/);
    await resumeRefresh(root,run.id);
    mkdirSync(path.join(root,'app/locked'),{recursive:true});
    mkdirSync(path.join(patch,'app/locked'),{recursive:true});
    writeFileSync(path.join(patch,'app/locked/new.css'),'button { cursor: pointer; }');
    chmodSync(path.join(root,'app/locked'),0o555);
    try { await assert.rejects(applyRefresh(root,run.id,'Button',patch),/EACCES/); }
    finally { chmodSync(path.join(root,'app/locked'),0o755); }
    assert.ok(loadRun(root,run.id).transaction,'actual write failure leaves a recoverable journal');
    assert.equal(readFileSync(path.join(root,'app/theme.css'),'utf8'),readFileSync(path.join(patch,'app/theme.css'),'utf8'),'first journaled write survives the interruption');
    await resumeRefresh(root,run.id);
    assert.equal(existsSync(path.join(root,'app/locked/new.css')),true);
    assert.equal(loadRun(root,run.id).worklist[0].status,'implemented');
    await resumeRefresh(root,run.id);
    for (const item of plan.items) await evidence(root,run.id,item);
    assert.equal((await verifyRefresh(root,run.id)).complete,true);
    const after=loadRun(root,run.id).evidence['Home:0'].after;
    const image=readFileSync(path.join(root,after.file));writeFileSync(path.join(root,after.file),'corrupt');
    assert.equal((await verifyRefresh(root,run.id)).complete,false);writeFileSync(path.join(root,after.file),image);
    const runFile=path.join(root,'design/refresh',run.id,'run.json');const saved=readFileSync(runFile);const stale=read(runFile);stale.evidence['Button:0'].after.implementation=digest('old code');write(runFile,stale);
    assert.equal((await verifyRefresh(root,run.id)).complete,false);writeFileSync(runFile,saved);
    await completeRefresh(root,run.id);
    const snapshot=fileSnapshot(root,['design','app']);
    assert.deepEqual(await stageRefresh(root,{...request,id:'rerun'}),{unchanged:true,runId:run.id});
    assert.deepEqual(fileSnapshot(root,['design','app']),snapshot,'unchanged run changes no tracked records');
    writeFileSync(path.join(root,'exports/theme.css'),readFileSync(path.join(root,'exports/theme.css'),'utf8')+'\n/* export comment, unchanged rendering */');
    assert.deepEqual(await stageRefresh(root,{...request,id:'comment-rerun'}),{unchanged:true,runId:run.id});
    assert.deepEqual(fileSnapshot(root,['design','app']),snapshot);
    const reanalyzed=await stageRefresh(root,{...request,id:'reanalysis',reanalyze:true});assert.equal(reanalyzed.status,'staged');
    writeFileSync(path.join(root,'exports/theme.css'),'body{color:red}');
    assert.equal((await verifyRefresh(root,run.id)).complete,false,'later source-only edit stales previous pass');
  } finally {p.server.server.close();rmSync(root,{recursive:true,force:true});}
});

test('reference correspondence handles order and rename; blocks omissions, ambiguous identity, dangling mappings and stale revisions', {timeout:30000},async()=>{
  const p=await project();
  try {
    const prior=p.index;const next=structuredClone(prior);next.sources[0].ref='renamed.html';next.frames=next.frames.reverse().map(f=>({...f,source:'renamed.html'}));
    const mapping=[{from:p.source,to:'renamed.html',revision:prior.sources[0].revision}];
    const reconciled=reconcileFrames(prior,next,mapping);assert.equal(reconciled.conflicts.length,0);
    assert.equal(reconciled.mappings.length,prior.frames.length);
    assert.throws(()=>reconcileFrames(prior,next,[{...mapping[0],revision:digest('old')}]),/Stale source revision/);
    const partial=structuredClone(next);partial.frames.pop();assert.ok(reconcileFrames(prior,partial,mapping).conflicts.length>0);
    const ambiguous=structuredClone(next);ambiguous.frames.push({...ambiguous.frames[0],id:'index/99'});assert.ok(reconcileFrames(prior,ambiguous,mapping).conflicts.length>0);
    const broken=structuredClone(prior);broken.sources[0].frames.push('index/99');assert.throws(()=>validateFrameIndex(broken,path.join(p.root,'design/reference')),/Dangling/);
    const stale=structuredClone(prior);stale.sources[0].revision=digest('stale');assert.throws(()=>validateFrameIndex(stale,path.join(p.root,'design/reference')),/Stale source revision/);
    const inventory=structuredClone(p.inventory);inventory.sources[0].hash=digest('stale');assert.throws(()=>validateReferenceInventory(inventory,prior),/Stale inventory source/);
    const delta={version:1,status:'complete',sources:[],frames:[],screens:[],atoms:[{name:'Button',evidence:'Fresh observation',states:['focus']}],molecules:[],organisms:[],tokens_observed:{color:'red'}};
    const replaced=mergeInventories(p.inventory,delta,{mode:'replace',frames:next,reconciliation:reconciled});
    assert.equal(replaced.atoms[0].name,'Button');assert.equal(replaced.atoms[0].evidence,'Fresh observation');assert.equal(replaced.sources.length,1);assert.equal(replaced.sources[0].ref,'renamed.html');
    assert.equal(mergeInventories(p.inventory,delta).sources[0].ref,p.source,'default stays additive');
  } finally {p.server.server.close();rmSync(p.root,{recursive:true,force:true});}
});

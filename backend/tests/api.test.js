import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {createIncubatorService} from '../src/services/incubator-service.js';
import {readConfig} from '../src/config.js';
let server,base;
before(async()=>{
  server=createApp({service:createIncubatorService(()=>Date.parse('2026-11-03T03:00:00Z'))}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
async function get(path){const r=await fetch(base+path);return {status:r.status,body:await r.json()};}
test('health honestly reports unconfigured integrations',async()=>{
  const {status,body}=await get('/api/health');assert.equal(status,200);assert.equal(body.database.status,'not_configured');assert.equal(body.devices.connected,false);
});
test('16 unique eggs and matching detail',async()=>{
  const {body}=await get('/api/incubators/1/eggs');assert.equal(body.source,'mock');assert.equal(body.data.length,16);
  assert.equal(new Set(body.data.map(e=>e.slot)).size,16);
  assert.deepEqual((await get('/api/incubators/1/eggs/4')).body.data,body.data[3]);
});
test('history and latest agree, ordered 3-second samples',async()=>{
  const history=(await get('/api/incubators/1/sensors/history')).body.data;
  assert.equal(history.length,40);assert.deepEqual(history.at(-1),(await get('/api/incubators/1/sensors/latest')).body.data);
  for(let i=1;i<history.length;i++)assert.equal(Date.parse(history[i].recordedAt)-Date.parse(history[i-1].recordedAt),3000);
  assert.equal((await get('/api/incubators/1/sensors/history?limit=2')).body.data.length,2);
});
test('status explicitly uses simulation',async()=>{
  const {body}=await get('/api/incubators/1/status');assert.equal(body.data.deviceConnected,false);assert.equal(body.data.operatingMode,'simulation');
});
test('invalid input and missing resources return JSON errors',async()=>{
  for(const path of ['/api/incubators/abc/status','/api/incubators/1/eggs/-1','/api/incubators/1/sensors/history?limit=999','/api/incubators/1/sensors/history?limit=2.5'])assert.equal((await get(path)).status,400);
  for(const path of ['/api/incubators/2/status','/api/incubators/1/eggs/17','/api/missing'])assert.equal((await get(path)).status,404);
});
test('invalid configuration cannot silently enable real data',()=>{
  assert.throws(()=>readConfig({DATA_SOURCE:'real'}));assert.throws(()=>readConfig({PORT:'abc'}));assert.throws(()=>readConfig({HOST:'0.0.0.0'}));
});

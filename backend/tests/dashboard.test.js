import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {createIncubatorService} from '../src/services/incubator-service.js';
test('serves dashboard only, keeps secrets inaccessible and validates calendar writes',async()=>{
  let saved=null;
  const service={...createIncubatorService(),setStartDate:async(id,date)=>{saved={id,date};return id===1;}};
  const server=createApp({service}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const patch=(body,origin=base)=>fetch(base+'/api/incubators/1/batch',{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  try {
    const home=await fetch(base+'/');assert.equal(home.status,200);
    const html=await home.text();assert.ok(html.includes('refreshDashboard'));assert.ok(!html.includes('Math.random'));assert.ok(!html.includes('localStorage'));
    assert.equal((await fetch(base+'/.env')).status,404);
    assert.equal((await fetch(base+'/src/server.js')).status,404);
    assert.equal((await patch({batchId:1,startDate:'2026-02-30'})).status,400);assert.equal(saved,null);
    assert.equal((await patch({batchId:1,startDate:'2026-11-03'},'https://example.org')).status,403);assert.equal(saved,null);
    assert.equal((await patch({batchId:1,startDate:'2026-11-03'})).status,200);
    assert.deepEqual(saved,{id:1,date:'2026-11-03'});
    assert.equal((await patch({batchId:2,startDate:'2026-11-03'})).status,409);
  } finally {await new Promise(resolve=>server.close(resolve));}
});

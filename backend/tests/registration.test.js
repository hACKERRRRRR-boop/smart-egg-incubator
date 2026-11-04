import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
test('pending signup, administrator approval and viewer permissions',async()=>{
  let registered=null,approved=false;
  const auth={register:async(...args)=>{registered=args;},login:async()=>approved?{token:'viewer',user:{id:2,username:'friend',role:'viewer'}}:{pending:true},
    resolve:async token=>token==='admin'?{id:1,username:'owner',role:'admin'}:token==='viewer'&&approved?{id:2,username:'friend',role:'viewer'}:null,
    pending:async()=>[{id:2,username:'friend'}],approve:async(id,by)=>{assert.equal(by,1);approved=id===2;return approved;},logout:async()=>{}};
  const server=createApp({auth}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,body,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:`incubator_session=${token||''}`,Origin:base},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(base+'/register')).status,200);
    assert.equal((await post('/api/auth/register',{username:'friend',password:'1234567'})).status,400);
    assert.equal((await post('/api/auth/register',{username:'Friend',password:'Test1234',role:'admin'})).status,201);
    assert.deepEqual(registered,['friend','Test1234']);
    const pending=await post('/api/auth/login',{username:'friend',password:'a-long-test-password'});
    assert.equal(pending.status,403);assert.equal(pending.headers.get('set-cookie'),null);
    assert.equal((await post('/api/auth/approve',{userId:2})).status,401);
    assert.equal((await post('/api/auth/approve',{userId:2},'admin')).status,200);
    assert.equal((await post('/api/auth/login',{username:'friend',password:'a-long-test-password'})).status,200);
    assert.equal((await fetch(base+'/api/incubators/1/eggs',{headers:{Cookie:'incubator_session=viewer'}})).status,200);
    assert.equal((await fetch(base+'/api/auth/pending',{headers:{Cookie:'incubator_session=viewer'}})).status,403);
    assert.equal((await post('/api/auth/approve',{userId:2},'viewer')).status,403);
    assert.equal((await fetch(base+'/api/incubators/1/batch',{method:'PATCH',headers:{'Content-Type':'application/json',Cookie:'incubator_session=viewer'},body:JSON.stringify({batchId:1,startDate:'2026-11-03'})})).status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

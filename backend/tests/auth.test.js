import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {hashPassword,verifyPassword} from '../src/auth/password.js';
test('password hashes use unique salts and reject incorrect passwords',async()=>{
  const a=await hashPassword('test-password-123'),b=await hashPassword('test-password-123');
  assert.notEqual(a,b);assert.equal(await verifyPassword('test-password-123',a),true);
  assert.equal(await verifyPassword('wrong',a),false);assert.equal(await verifyPassword('wrong','broken'),false);
});
test('login protects HTML and API, rejects cross-origin, rotates and revokes sessions',async()=>{
  const sessions=new Set();let number=0;
  const auth={login:async(u,p)=>{if(u!=='admin'||p!=='test-password-123')return null;const token=String(++number).padStart(64,'0');sessions.add(token);return {token,user:{id:1,username:u,role:'admin'}};},
    resolve:async token=>sessions.has(token)?{id:1,username:'admin',role:'admin'}:null,
    logout:async token=>{sessions.delete(token);}};
  const server=createApp({auth}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const login=(password,origin=base,cookie='')=>fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify({username:'admin',password})});
  try{
    const redirect=await fetch(base+'/',{redirect:'manual'});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/login');
    assert.equal((await fetch(base+'/login')).status,200);
    assert.equal((await fetch(base+'/api/incubators/1/eggs')).status,401);
    assert.equal((await fetch(base+'/api/incubators/1/batch',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
    assert.equal((await login('wrong')).status,401);
    assert.equal((await login('test-password-123','https://example.com')).status,403);
    const accepted=await login('test-password-123');assert.equal(accepted.status,200);
    const setCookie=accepted.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);
    const first=setCookie.split(';')[0];assert.equal((await fetch(base+'/api/incubators/1/eggs',{headers:{Cookie:first}})).status,200);
    const rotated=await login('test-password-123',base,first);const cookie=rotated.headers.get('set-cookie').split(';')[0];
    assert.notEqual(cookie,first);assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:first}})).status,401);
    assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:'{}'})).status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).status,401);
    for(let i=0;i<10;i++)assert.equal((await login('wrong')).status,401);
    assert.equal((await login('wrong')).status,429);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

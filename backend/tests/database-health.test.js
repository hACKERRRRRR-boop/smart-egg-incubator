import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
test('database failures report 503 instead of falling back to mock memory',async()=>{
  const server=createApp({databaseCheck:async()=>{throw new Error('unavailable');}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    const body=await response.json();assert.equal(response.status,503);
    assert.equal(body.database.status,'unavailable');assert.equal(body.storage,'postgres');
  } finally {await new Promise(resolve=>server.close(resolve));}
});

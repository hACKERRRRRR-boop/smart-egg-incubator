import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export async function hashPassword(password) {
  const salt=randomBytes(16).toString('hex');
  const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,stored) {
  const [algorithm,salt,hash]=stored.split('$');
  if(algorithm!=='scrypt'||!salt||!hash||!/^[0-9a-f]{128}$/.test(hash))return false;
  const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return timingSafeEqual(key,Buffer.from(hash,'hex'));
}

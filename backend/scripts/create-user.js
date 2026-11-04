import readline from 'node:readline';
import {Writable} from 'node:stream';
import {createPool} from '../src/db/pool.js';
import {hashPassword} from '../src/auth/password.js';
// Suppress password echo; no password in command arguments, logs or source files.
let hidden=false;
const output=new Writable({write(chunk,encoding,done){if(!hidden)process.stdout.write(chunk);done();}});
const rl=readline.createInterface({input:process.stdin,output,terminal:true});
function ask(prompt,secret=false){
  return new Promise(resolve=>{
    hidden=false;
    // Let readline own the prompt; an empty question erased the separately printed text on Windows.
    rl.question(prompt,value=>{
      hidden=false;
      if(secret)process.stdout.write('\n');
      resolve(value);
    });
    hidden=secret;
  });
}
let pool;
try {
  if(!process.stdin.isTTY)throw new Error('Run this command in your VS Code terminal');
  const username=(await ask('Username (3-32 letters/numbers/underscore): ')).trim().toLowerCase();
  if(!/^[a-z0-9_]{3,32}$/.test(username))throw new Error('Use 3-32 lowercase letters, numbers or underscore');
  const password=await ask('Password (at least 8 characters, hidden): ',true);
  const confirm=await ask('Confirm password (hidden): ',true);
  if(password.length<8||password.length>256)throw new Error('Password must have 8-256 characters');
  if(password!==confirm)throw new Error('Passwords do not match');
  pool=createPool();
  await pool.query('INSERT INTO app_users(username,password_hash) VALUES($1,$2)',[username,await hashPassword(password)]);
  console.log('Login account created. Open http://127.0.0.1:3000/login');
} catch(error) {console.error(error.code==='23505'?'Username already exists. No password was changed.':error.code||error.message);process.exitCode=1;}
finally{rl.close();if(pool)await pool.end();}

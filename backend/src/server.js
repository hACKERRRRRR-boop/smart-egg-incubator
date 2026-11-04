import {createApp} from './app.js';
import {readConfig} from './config.js';
import {createPool,checkDatabase} from './db/pool.js';
import {createPostgresService} from './services/postgres-service.js';
import {createAuthService} from './auth/service.js';
const config=readConfig();
const pool=config.store==='postgres'?createPool():null;
if(!pool)throw new Error('Login requires DATA_STORE=postgres. Configure .env and run db:migrate.');
const app=createApp({service:createPostgresService(pool),databaseCheck:()=>checkDatabase(pool),auth:createAuthService(pool)});
const server=app.listen(config.port,config.host,()=>{
  console.log(`Backend ready: http://${config.host}:${config.port}/api/health`);
  console.log(`MOCK DATA ONLY | Storage: ${config.store} | MQTT and physical devices are not connected`);
});
server.on('error',async error=>{console.error(`Cannot start backend: ${error.code}`);if(pool)await pool.end();process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{if(pool)await pool.end();process.exit(0);}));

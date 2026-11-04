import express from 'express';
import {fileURLToPath} from 'node:url';
import {createIncubatorRouter} from './routes/incubators.js';
import {createIncubatorService} from './services/incubator-service.js';
import {createAuthRouter,requireLogin} from './auth/routes.js';
export function createApp({service=createIncubatorService(),databaseCheck=null,auth=null}={}) {
  const app=express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'8kb'}));
  app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.get('/login',(req,res)=>res.sendFile(fileURLToPath(new URL('../public/login.html',import.meta.url))));
  app.get('/register',(req,res)=>res.sendFile(fileURLToPath(new URL('../public/register.html',import.meta.url))));
  if(auth)app.use('/api/auth',createAuthRouter(auth));
  app.get('/api/health',async(req,res)=>{
    let database='not_configured';
    if(databaseCheck){try{await databaseCheck();database='connected';}catch{database='unavailable';}}
    res.status(database==='unavailable'?503:200).json({status:database==='unavailable'?'degraded':'ok',source:'mock',
      storage:databaseCheck?'postgres':'memory',database:{status:database},mqtt:{status:'disabled'},devices:{connected:false}});
  });
  if(auth)app.use(requireLogin(auth));
  app.get('/',(req,res)=>res.sendFile(fileURLToPath(new URL('../public/index.html',import.meta.url))));
  app.use('/api/incubators',createIncubatorRouter(service));
  app.use((req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'API route not found'}}));
  app.use((err,req,res,next)=>{
    console.error('Request failed:',err.code || 'INTERNAL_ERROR');
    res.status(500).json({error:{code:'INTERNAL_ERROR',message:'Internal server error'}});
  });
  return app;
}

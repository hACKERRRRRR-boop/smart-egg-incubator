import {Router} from 'express';
import {SESSION_MS} from './service.js';
export const COOKIE='incubator_session';
export const readToken=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
const cookieOptions={httpOnly:true,sameSite:'strict',path:'/',secure:process.env.NODE_ENV==='production'};
export function createAuthRouter(auth) {
  const router=Router(),attempts=new Map(),registrations=new Map();
  router.use((req,res,next)=>{
    if(req.method==='POST') {
      const origin=req.get('origin');
      if((origin && origin!==`${req.protocol}://${req.get('host')}`)||req.get('sec-fetch-site')==='cross-site')
        return res.status(403).json({error:{code:'ORIGIN_REJECTED'}});
      if(!req.is('application/json'))return res.status(415).json({error:{code:'JSON_REQUIRED'}});
    }
    next();
  });
  router.post('/register',async(req,res)=>{
    const now=Date.now();for(const [ip,value] of registrations)if(value.until<=now)registrations.delete(ip);
    const limit=registrations.get(req.ip)||{count:0,until:now+15*60*1000};
    if(limit.count>=5)return res.status(429).json({error:{code:'TOO_MANY_ATTEMPTS'}});
    limit.count++;registrations.set(req.ip,limit);
    const {username,password}=req.body||{};
    if(typeof username!=='string'||typeof password!=='string'||password.length<8||password.length>256||!/^[a-z0-9_]{3,32}$/.test(username.trim().toLowerCase()))
      return res.status(400).json({error:{code:'INVALID_INPUT'}});
    try{await auth.register(username.trim().toLowerCase(),password);}
    catch(error){if(error.code==='23505')return res.status(409).json({error:{code:'USERNAME_TAKEN'}});throw error;}
    res.status(201).json({status:'pending'});
  });
  router.get('/pending',requireLogin(auth),async(req,res)=>{
    if(req.user.role!=='admin')return res.status(403).json({error:{code:'ADMIN_REQUIRED'}});
    res.json({users:await auth.pending()});
  });
  router.post('/approve',requireLogin(auth),async(req,res)=>{
    if(req.user.role!=='admin')return res.status(403).json({error:{code:'ADMIN_REQUIRED'}});
    const id=req.body?.userId;
    if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:{code:'INVALID_ID'}});
    if(!await auth.approve(id,req.user.id))return res.status(409).json({error:{code:'NOT_PENDING'}});
    res.json({ok:true});
  });
  router.post('/login',async(req,res)=>{
    const now=Date.now(),key=req.ip;
    for(const [ip,value] of attempts)if(value.until<=now)attempts.delete(ip);
    const attempt=attempts.get(key)||{count:0,until:now+15*60*1000};
    if(attempt.count>=10){res.set('Retry-After',String(Math.ceil((attempt.until-now)/1000)));return res.status(429).json({error:{code:'TOO_MANY_ATTEMPTS'}});}
    attempt.count++;attempts.set(key,attempt);
    const {username,password}=req.body||{};
    if(typeof username!=='string'||typeof password!=='string'||password.length>256||username.length>32)
      return res.status(400).json({error:{code:'INVALID_INPUT'}});
    const result=await auth.login(username.trim().toLowerCase(),password);
    if(!result)return res.status(401).json({error:{code:'INVALID_CREDENTIALS'}});
    if(result.pending)return res.status(403).json({error:{code:'AWAITING_APPROVAL'}});
    // Revoke the old browser session before issuing a new random token.
    await auth.logout(readToken(req));attempts.delete(key);
    res.cookie(COOKIE,result.token,{...cookieOptions,maxAge:SESSION_MS});
    res.json({user:result.user});
  });
  router.post('/logout',async(req,res)=>{
    await auth.logout(readToken(req));res.clearCookie(COOKIE,cookieOptions);res.json({ok:true});
  });
  router.get('/me',async(req,res)=>{
    const user=await auth.resolve(readToken(req));
    if(!user)return res.status(401).json({error:{code:'AUTH_REQUIRED'}});
    res.json({user});
  });
  return router;
}
export function requireLogin(auth) {
  return async(req,res,next)=>{
    try {
      const user=await auth.resolve(readToken(req));
      if(!user){if(req.path==='/')return res.redirect('/login');return res.status(401).json({error:{code:'AUTH_REQUIRED'}});}
      req.user=user;next();
    } catch {res.status(503).json({error:{code:'AUTH_UNAVAILABLE',message:'ตรวจการเชื่อมต่อฐานข้อมูลและรัน db:migrate'}});}
  };
}

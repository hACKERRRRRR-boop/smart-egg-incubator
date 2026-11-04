import {randomBytes,createHash} from 'node:crypto';
import {verifyPassword,hashPassword} from './password.js';
const digest=token=>createHash('sha256').update(token).digest('hex');
export const SESSION_MS=8*60*60*1000;
export function createAuthService(pool) {
  const dummy=hashPassword(randomBytes(32).toString('hex'));
  return {
    register:async(username,password)=>{
      await pool.query("INSERT INTO app_users(username,password_hash,role,approval_status) VALUES($1,$2,'viewer','pending')",[username,await hashPassword(password)]);
    },
    pending:async()=> (await pool.query("SELECT id,username,created_at FROM app_users WHERE approval_status='pending' ORDER BY created_at,id")).rows,
    approve:async(id,adminId)=> (await pool.query("UPDATE app_users SET approval_status='approved',approved_by=$2,approved_at=now() WHERE id=$1 AND approval_status='pending' AND role='viewer' RETURNING id",[id,adminId])).rowCount===1,
    login:async(username,password)=>{
      const user=(await pool.query('SELECT id,username,role,password_hash,approval_status FROM app_users WHERE username=$1',[username])).rows[0];
      const valid=await verifyPassword(password,user?.password_hash || await dummy);
      if(!user||!valid)return null;
      if(user.approval_status!=='approved')return {pending:true};
      const token=randomBytes(32).toString('hex');
      await pool.query('DELETE FROM app_sessions WHERE expires_at <= now()');
      await pool.query('INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[digest(token),user.id,new Date(Date.now()+SESSION_MS)]);
      return {token,user:{id:user.id,username:user.username,role:user.role}};
    },
    resolve:async token=>{
      if(!/^[0-9a-f]{64}$/.test(token||''))return null;
      return (await pool.query(`SELECT u.id,u.username,u.role FROM app_sessions s JOIN app_users u ON u.id=s.user_id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND u.approval_status='approved'`,[digest(token)])).rows[0] || null;
    },
    logout:async token=>{if(/^[0-9a-f]{64}$/.test(token||''))await pool.query('DELETE FROM app_sessions WHERE token_hash=$1',[digest(token)]);}
  };
}

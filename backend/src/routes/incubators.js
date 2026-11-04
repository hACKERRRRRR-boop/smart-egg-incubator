import {Router} from 'express';
export function createIncubatorRouter(service) {
  const router=Router();
  const error=(res,status,code,message)=>res.status(status).json({error:{code,message}});
  const send=async(res,data)=>res.json({source:'mock',data:await data});
  router.param('incubatorId',(req,res,next,id)=>{
    if(!/^[1-9]\d*$/.test(id)) return error(res,400,'INVALID_ID','Incubator ID must be a positive integer');
    if(id!=='1') return error(res,404,'NOT_FOUND','Incubator not found');
    next();
  });
  router.get('/:incubatorId/status',(req,res)=>send(res,service.status()));
  router.patch('/:incubatorId/batch',async(req,res)=>{
    if(req.user && req.user.role!=='admin')return error(res,403,'ADMIN_REQUIRED','Only administrators may change the incubation date');
    // Local browser requests may write only from this server's origin.
    const origin=req.get('origin');
    if(origin && origin !== `${req.protocol}://${req.get('host')}`)
      return error(res,403,'ORIGIN_REJECTED','Cross-origin writes are not allowed');
    if(!req.is('application/json'))return error(res,415,'JSON_REQUIRED','Use application/json');
    const {startDate,batchId}=req.body || {};
    const parsed=typeof startDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)?new Date(startDate+'T00:00:00Z'):null;
    if(!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==startDate || startDate<'1900-01-01')
      return error(res,400,'INVALID_DATE','startDate must be a valid YYYY-MM-DD date');
    if(!Number.isSafeInteger(batchId)||batchId<1)return error(res,400,'INVALID_BATCH','A valid batchId is required');
    if(!service.setStartDate)return error(res,409,'DATABASE_REQUIRED','Calendar changes require PostgreSQL mode');
    const changed=await service.setStartDate(batchId,startDate);
    if(!changed)return error(res,409,'BATCH_CHANGED','The active batch changed; reload the dashboard');
    return send(res,await service.status());
  });
  router.get('/:incubatorId/sensors/latest',(req,res)=>send(res,service.latest()));
  router.get('/:incubatorId/sensors/history',(req,res)=>{
    const limit=req.query.limit??'40';
    if(typeof limit!=='string'||!/^[1-9]\d*$/.test(limit)||Number(limit)>40)
      return error(res,400,'INVALID_LIMIT','limit must be an integer from 1 to 40');
    return send(res,service.history(Number(limit)));
  });
  router.get('/:incubatorId/eggs',(req,res)=>send(res,service.eggs()));
  router.get('/:incubatorId/eggs/:eggId',async(req,res)=>{
    if(!/^[1-9]\d*$/.test(req.params.eggId)) return error(res,400,'INVALID_ID','Egg ID must be a positive integer');
    const egg=await service.egg(Number(req.params.eggId));
    if(!egg) return error(res,404,'NOT_FOUND','Egg not found');
    return send(res,egg);
  });
  return router;
}

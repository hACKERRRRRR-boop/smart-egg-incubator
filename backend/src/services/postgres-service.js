const mapSensor=row=>row?({incubatorId:row.incubator_id,source:row.source,recordedAt:row.recorded_at.toISOString(),temperatureC:row.temperature_c,humidityPercent:row.humidity_percent}):null;
export function createPostgresService(pool) {
  async function listEggs() {
    const result=await pool.query(`SELECT e.id,e.slot,e.batch_id,b.incubator_id,a.* FROM eggs e
      JOIN incubation_batches b ON b.id=e.batch_id
      LEFT JOIN LATERAL (SELECT status,hatch_probability_percent,label,source,model_version,analyzed_at
        FROM ai_results WHERE egg_id=e.id ORDER BY analyzed_at DESC,id DESC LIMIT 1) a ON true
      WHERE b.incubator_id=1 AND b.status='active' ORDER BY e.slot`);
    return result.rows.map(row=>({id:row.slot,eggRecordId:row.id,batchId:row.batch_id,incubatorId:row.incubator_id,slot:row.slot,
      source:row.source || 'mock',status:row.status || 'pending',analysis:row.analyzed_at?{
        source:row.source,modelVersion:row.model_version,analyzedAt:row.analyzed_at.toISOString(),
        hatchProbabilityPercent:row.hatch_probability_percent,label:row.label}:null}));
  }
  return {
    setStartDate:async(batchId,startDate)=>{
      const result=await pool.query("UPDATE incubation_batches SET start_date=$1 WHERE id=$2 AND incubator_id=1 AND status='active' AND source='mock' RETURNING id",[startDate,batchId]);
      return result.rowCount===1;
    },
    latest:async()=>mapSensor((await pool.query('SELECT * FROM sensor_readings WHERE incubator_id=1 ORDER BY recorded_at DESC,id DESC LIMIT 1')).rows[0]),
    history:async(limit=40)=>(await pool.query('SELECT * FROM sensor_readings WHERE incubator_id=1 ORDER BY recorded_at DESC,id DESC LIMIT $1',[limit])).rows.reverse().map(mapSensor),
    eggs:listEggs,
    egg:async slot=>(await listEggs()).find(egg=>egg.slot===slot) || null,
    status:async()=>{
      const cabinet=(await pool.query('SELECT * FROM incubators WHERE id=1')).rows[0];
      if(!cabinet)return null;
      const batch=(await pool.query("SELECT id,start_date::text,duration_days,status,source FROM incubation_batches WHERE incubator_id=1 AND status='active'")).rows[0];
      const device=(await pool.query('SELECT * FROM device_states WHERE incubator_id=1')).rows[0];
      return {id:1,capacity:cabinet.capacity,source:'mock',operatingMode:'simulation',deviceConnected:false,databaseConnected:true,mqttConnected:false,
        activeBatch:batch?{id:batch.id,startDate:batch.start_date,durationDays:batch.duration_days,status:batch.status,source:batch.source}:null,
        devices:device?{heater:device.heater?'simulated_on':'simulated_off',humidifier:device.humidifier?'simulated_on':'simulated_standby',candlingLight:device.candling_light?'simulated_on':'simulated_off',reportedAt:device.reported_at.toISOString()}:null};
    }
  };
}

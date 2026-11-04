import {createPool} from '../src/db/pool.js';
import {eggs,sample,INTERVAL_MS} from '../src/mock/data.js';
export async function seed(pool) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(160021)');
    const done=await client.query('SELECT 1 FROM seed_runs WHERE name=$1',['demo-v1']);
    if(done.rowCount){await client.query('COMMIT');return false;}
    // Refuse to overwrite any existing cabinet or production-like records.
    const existing=await client.query('SELECT 1 FROM incubators LIMIT 1');
    if(existing.rowCount) throw new Error('Seed requires an empty demo database; existing data was preserved');
    await client.query('INSERT INTO incubators(id,name) VALUES(1,$1)',['ตู้ฟักไข่จำลอง 16 ฟอง']);
    const batch=await client.query("INSERT INTO incubation_batches(incubator_id,start_date,status,source) VALUES(1,(now() AT TIME ZONE 'Asia/Bangkok')::date,'active','mock') RETURNING id");
    const time=Math.floor(Date.now()/INTERVAL_MS)*INTERVAL_MS;
    for(const egg of eggs) {
      const inserted=await client.query('INSERT INTO eggs(batch_id,slot) VALUES($1,$2) RETURNING id',[batch.rows[0].id,egg.slot]);
      await client.query("INSERT INTO ai_results(egg_id,analyzed_at,status,hatch_probability_percent,label,source) VALUES($1,$2,$3,$4,$5,'mock')",
        [inserted.rows[0].id,new Date(time),egg.status,egg.analysis.hatchProbabilityPercent,egg.analysis.label]);
    }
    for(let i=39;i>=0;i--) {
      const value=sample(time-i*INTERVAL_MS);
      await client.query("INSERT INTO sensor_readings(incubator_id,recorded_at,temperature_c,humidity_percent,source) VALUES(1,$1,$2,$3,'mock')",[value.recordedAt,value.temperatureC,value.humidityPercent]);
    }
    await client.query("INSERT INTO device_states VALUES(1,true,false,false,'mock',$1)",[new Date(time)]);
    await client.query('INSERT INTO seed_runs(name) VALUES($1)',['demo-v1']);
    await client.query('COMMIT');return true;
  } catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/seed.js')) {
  let pool;
  try{pool=createPool();console.log(await seed(pool)?'Demo seed saved: 16 eggs, 40 sensor readings.':'Demo seed already exists; no data changed.');}
  catch(error){console.error('Seed failed:',error.code || error.message);process.exitCode=1;}
  finally{if(pool)await pool.end();}
}

import {readFile,readdir} from 'node:fs/promises';
import {createPool} from '../src/db/pool.js';
export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(160021)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = new URL('../db/migrations/',import.meta.url);
    for (const file of (await readdir(directory)).filter(f=>f.endsWith('.sql')).sort()) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1',[file]);
      if (applied.rowCount) continue;
      await client.query(await readFile(new URL(file,directory),'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)',[file]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/migrate.js')) {
  let pool;
  try {pool=createPool();await migrate(pool);console.log('Database migrations ready.');}
  catch(error){console.error('Migration failed:',error.code || error.message);process.exitCode=1;}
  finally {if(pool) await pool.end();}
}

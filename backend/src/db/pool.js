import pg from 'pg';
export function createPool(env = process.env) {
  for (const key of ['PGHOST','PGDATABASE','PGUSER']) {
    if (!env[key]) throw new Error(`Missing ${key}; configure your local .env`);
  }
  // This milestone only supports the explicitly separate local demo database.
  if (!['127.0.0.1','localhost'].includes(env.PGHOST) || env.PGDATABASE !== 'incubator_demo')
    throw new Error('This milestone requires local PGDATABASE=incubator_demo');
  const pool = new pg.Pool({host:env.PGHOST,port:Number(env.PGPORT || 5432),
    database:env.PGDATABASE,user:env.PGUSER,password:env.PGPASSWORD,
    max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,statement_timeout:10000});
  pool.on('error', error => console.error('Database connection error:', error.code || 'UNKNOWN'));
  return pool;
}
export async function checkDatabase(pool) {
  await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', ['001_initial.sql']).then(result => {
    if (!result.rowCount) throw new Error('Schema migration not applied');
  });
}

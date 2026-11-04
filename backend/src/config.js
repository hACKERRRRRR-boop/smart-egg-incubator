export function readConfig(env=process.env) {
  const host=env.HOST||'127.0.0.1',port=Number(env.PORT||3000),source=env.DATA_SOURCE||'mock';
  if(!Number.isInteger(port)||port<1||port>65535) throw new Error('PORT must be an integer from 1 to 65535');
  if(host!=='127.0.0.1'&&host!=='localhost') throw new Error('This local development milestone only supports localhost');
  if(source!=='mock') throw new Error('Only DATA_SOURCE=mock is implemented; real devices are not connected');
  const store=env.DATA_STORE||'memory';
  if(!['memory','postgres'].includes(store)) throw new Error('DATA_STORE must be memory or postgres');
  return {host,port,source,store};
}

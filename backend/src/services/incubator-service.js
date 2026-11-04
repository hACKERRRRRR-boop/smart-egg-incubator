import {eggs,sample,INTERVAL_MS} from '../mock/data.js';
export function createIncubatorService(now=()=>Date.now()) {
  const tick=()=>Math.floor(now()/INTERVAL_MS)*INTERVAL_MS;
  return {
    latest:()=>sample(tick()),
    history:(limit=40)=>{const end=tick();return Array.from({length:limit},(_,i)=>sample(end-(limit-1-i)*INTERVAL_MS));},
    eggs:()=>structuredClone(eggs),
    egg:id=>{const egg=eggs.find(e=>e.id===id);return egg?structuredClone(egg):null;},
    status:()=>({id:1,capacity:16,source:'mock',operatingMode:'simulation',activeBatch:null,
      deviceConnected:false,databaseConnected:false,mqttConnected:false,
      devices:{heater:'simulated_on',humidifier:'simulated_standby',candlingLight:'simulated_off'}})
  };
}

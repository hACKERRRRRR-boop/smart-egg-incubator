// Synthetic fixtures only; never import this module into real-device ingestion.
export const INTERVAL_MS = 3000;
export const eggs = [95,92,88,48,94,91,89,97,85,0,90,93,96,87,92,95].map((p,i) => ({
  id:i+1, incubatorId:1, slot:i+1, source:'mock',
  status:p===0?'none':p<60?'watch':'good',
  analysis:{source:'mock', modelVersion:null, hatchProbabilityPercent:p,
    label:p===0?'ไม่พบตัวอ่อน':p<60?'ควรติดตาม':'ตัวอ่อนสมบูรณ์'}
}));
export function sample(timestamp) {
  const phase=timestamp/INTERVAL_MS;
  return {incubatorId:1,source:'mock',recordedAt:new Date(timestamp).toISOString(),
    temperatureC:Number((37.5+Math.sin(phase/8)*.2).toFixed(2)),
    humidityPercent:Number((55+Math.cos(phase/10)*3).toFixed(1))};
}

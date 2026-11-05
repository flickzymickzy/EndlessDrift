// Bank the entire run after a highway barrier hit.
// Traffic and police collisions still penalize the current run by 25%.
export function crashMultiplier(reason){
  if(typeof reason==='string'&&reason.includes('BARRIER'))return 1;
  return reason?0.75:1;
}

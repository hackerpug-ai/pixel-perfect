const {modeCheck}=await import(process.env.GATE_MODULE);
const r=modeCheck(process.cwd(),{command:'node scripts/sandbox-capture.mjs --width 1440',goldens:process.env.PROBE_GOLDENS,staging:process.env.PROBE_STAGING,catalogDir:'src/lib/components'},null);
console.log(JSON.stringify(r,null,2));
process.exit(r.exit);

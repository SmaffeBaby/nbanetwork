// Run inside backend container; this only writes to a disposable test profile.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto')
const {createClient}=require('@supabase/supabase-js'),{getAdmin}=require('../lib/supabase')
function choose(players,descending) {
 const slots=['PG','SG','SF','PF','C'],sorted=players.filter(p=>!p.injury && p.remaining>0).sort((a,b)=>(descending?-1:1)*(a.ovr-b.ovr))
 function walk(i,picks){if(i===5)return picks;for(const p of sorted.filter(p=>p.positions.includes(slots[i])&&!picks.some(x=>x.id===p.id))){const result=walk(i+1,[...picks,{id:p.id,slot:slots[i],ovr:p.ovr}]);if(result)return result}return null}
 return walk(0,[])
}
async function run(){
 const admin=getAdmin(),email=`daily-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID();let owner
 try{
  const {data:created,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;owner=created.user.id
  const {error:profileError}=await admin.from('profiles').insert({id:owner,email,first_name:'Daily',last_name:'Test'});if(profileError)throw profileError
  const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY||process.env.ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY,{realtime:{transport:require('ws')},auth:{persistSession:false,autoRefreshToken:false}})
  const {data:auth,error:authError}=await client.auth.signInWithPassword({email,password});if(authError)throw authError
  const request=async(path,body,authorized=false)=>{
   const r=await fetch(`http://127.0.0.1:3000/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(authorized?{Authorization:`Bearer ${auth.session.access_token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}
  }
  const {status,data:b}=await request('fantasy?mode=balanced');assert.equal(status,200,b.error);assert.ok(b.day.open);assert.equal(b.ovrCap,400)
  const low=choose(b.players,false),high=choose(b.players,true);assert.ok(low&&high);assert.ok(low.reduce((s,p)=>s+p.ovr,0)<=400);assert.ok(high.reduce((s,p)=>s+p.ovr,0)>400)
  const payload=(mode,lineup)=>({day:b.day.id,mode,lineup:lineup.map(p=>({...p,ovr:1}))})
  assert.equal((await request('fantasy/lineup',payload('balanced',low))).status,401)
  assert.equal((await request('fantasy/lineup',payload('balanced',high),true)).status,400)
  const saved=await request('fantasy/lineup',payload('unlimited',high),true);assert.equal(saved.status,201,saved.data.error)
  const balanced=await request('fantasy/lineup',payload('balanced',low),true);assert.equal(balanced.status,201,balanced.data.error)
  assert.equal((await request('fantasy/lineup',payload('balanced',low),true)).status,409)
  const after=await request(`fantasy?mode=balanced&day=${b.day.id}&profile=${owner}`);assert.equal(after.status,200,after.data.error)
  assert.equal(after.data.history.length,2);assert.ok(after.data.history.every(e=>e.lineup.every(p=>p.ovr>=60)))
  assert.equal(after.data.leaderboard.filter(e=>e.user_id===owner).length,1)
  assert.equal(after.data.ratingAt,b.ratingAt)
  const detail=await request(`fantasy/players/${low[0].id}?day=${b.day.id}&mode=balanced&profile=${owner}`);assert.equal(detail.status,200,detail.data.error);assert.equal(detail.data.rating.ovr,low[0].ovr);assert.equal(detail.data.fantasy.points,0)
  assert.equal((await request('fantasy?day=2026-02-30')).status,400)
  console.log('PASS: live slate, immutable OVR, auth, both modes, cap tampering, duplicate prevention, public history and player detail')
 }finally{if(owner){const {error}=await admin.auth.admin.deleteUser(owner);if(error)throw error;console.log('Disposable fantasy test account removed')}}
}
run().catch(error=>{console.error(error.message);process.exitCode=1})

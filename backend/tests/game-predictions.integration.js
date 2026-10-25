// Local integration check. Only the temporary account's own votes are changed.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto')
const {createClient}=require('@supabase/supabase-js'),{getAdmin}=require('../lib/supabase')
async function run(){
 const admin=getAdmin(),email=`prediction-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID()
 let owner
 try{
  const {data:created,error:creationError}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(creationError)throw creationError
  owner=created.user.id
  const {error:profileError}=await admin.from('profiles').insert({id:owner,email,first_name:'Preview',last_name:'Test'});if(profileError)throw profileError
  const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY||process.env.ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY,{realtime:{transport:require('ws')},auth:{persistSession:false,autoRefreshToken:false}})
  const {data:auth,error:authError}=await client.auth.signInWithPassword({email,password});if(authError)throw authError
  const request=async(path,method='GET',body=null,authorized=false)=>{
   const response=await fetch(`http://127.0.0.1:3000/api/${path}`,{method,headers:{'Content-Type':'application/json',...(authorized?{Authorization:`Bearer ${auth.session.access_token}`}:{})},...(body?{body:JSON.stringify(body)}:{})})
   return {status:response.status,data:await response.json()}
  }
  const preview=await request('game-preview/401909861');assert.equal(preview.status,200,preview.data.error)
  assert.equal(preview.data.source,'espn');assert.equal(preview.data.teams.length,2)
  for(const team of preview.data.teams){assert.equal(team.lineup.players.length,5);assert.equal(new Set(team.lineup.players.filter(p=>p.id).map(p=>p.id)).size,team.lineup.players.filter(p=>p.id).length);assert.equal(team.leaders.length,3)}
  assert.equal((await request('game-predictions/401909861','PUT',{side:'away'})).status,401)
  const before=await request('game-predictions/401909861');assert.equal(before.status,200);assert.equal(before.data.viewerVote,null)
  let vote=await request('game-predictions/401909861','PUT',{side:'away'},true);assert.equal(vote.status,200,vote.data.error);assert.equal(vote.data.viewerVote,'away')
  assert.equal(vote.data.total,before.data.total+1)
  assert.ok(vote.data.sides.away.voters.some(p=>p.id===owner && !('email' in p)))
  vote=await request('game-predictions/401909861','PUT',{side:'home'},true);assert.equal(vote.status,200);assert.equal(vote.data.total,before.data.total+1);assert.equal(vote.data.viewerVote,'home')
  vote=await request('game-predictions/401909861','PUT',{side:null},true);assert.equal(vote.status,200);assert.equal(vote.data.total,before.data.total)
  assert.equal((await request('game-predictions/401703370','PUT',{side:'home'},true)).status,409)
  console.log('PASS: preview data, authorized voting, public voter avatars, single vote/switch/cancel, live/final cutoff')
 }finally{if(owner){const {error}=await admin.auth.admin.deleteUser(owner);if(error)throw error;console.log('Temporary prediction test account removed')}}
}
run().catch(error=>{console.error(error.message);process.exitCode=1})

// Run inside the local backend container. Creates and removes only its own temporary account.
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')
const { getAdmin } = require('../lib/supabase')
async function run() {
 const admin=getAdmin(), email=`game-marks-${randomUUID()}@example.invalid`, password=randomUUID()+randomUUID()
 let userId
 try {
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true})
  if(createError) throw createError
  userId=created.user.id
  const legacy={id:'0022601234',date:'26.10.2026, 00:00',homeAbbr:'UTA',awayAbbr:'LAL'}
  const {error:profileError}=await admin.from('profiles').insert({id:userId,email,favorites_games:[legacy,{...legacy,id:'401909861'}],watched_games:[legacy]})
  if(profileError) throw profileError
  const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,{realtime:{transport:require('ws')},auth:{persistSession:false,autoRefreshToken:false}})
  const {data:session,error:authError}=await client.auth.signInWithPassword({email,password})
  if(authError) throw authError
  const request=async(kind,game,active)=>{
   const response=await fetch(`http://127.0.0.1:3000/api/profile-games/${kind}`,{method:'PUT',headers:{Authorization:`Bearer ${session.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({game,active})})
   const data=await response.json()
   assert.equal(response.status,200, data.error)
   return data
  }
  let result=await request('favorite',legacy,true)
  assert.equal(result.favoriteGames.length,1)
  assert.equal(result.favoriteGames[0].id,'espn:401909861')
  assert.equal(result.watchedGames[0].id,'espn:401909861')
  await Promise.all([request('favorite',{id:'401909862'},true),request('watched',{id:'espn:401909862'},true)])
  result=await request('favorite',{id:'espn:401909861'},false)
  assert.equal(result.favoriteGames.length,1)
  assert.equal(result.watchedGames.length,2)
  result=await request('watched',{id:'401909861'},false)
  assert.equal(result.favoriteGames.length,1)
  assert.equal(result.watchedGames.length,1)
  const denied=await fetch('http://127.0.0.1:3000/api/profile-games/favorite',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:{id:'401909861'},active:true})})
  assert.equal(denied.status,401)
  console.log('PASS: real API auth, NBA/ESPN duplicate consolidation, concurrent independent marks, removal and unauthorized access')
 } finally {
  if(userId) {
   const {error}=await admin.auth.admin.deleteUser(userId)
   if(error) throw error
   console.log('Temporary test account removed')
  }
 }
}
run().catch(error=>{console.error(error.message);process.exitCode=1})

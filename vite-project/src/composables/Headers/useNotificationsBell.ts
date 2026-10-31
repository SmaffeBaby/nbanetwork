import {computed,ref,watch} from 'vue'
import {useMutation,useQuery,useQueryClient} from '@tanstack/vue-query'
import {authFetch} from '../../api/authFetch'
import {useAuthStore} from '../../stores/auth'
import {notificationText,type Inbox} from '../../components/Headers/notificationTypes'
export function useNotificationsBell(){
 const auth=useAuthStore(),client=useQueryClient(),open=ref(false),settingsOpen=ref(false),limit=ref(50),actionError=ref('')
 const user=computed(()=>auth.user),userId=computed(()=>user.value?.id||'')
 const key=computed(()=>['profile-inbox',userId.value,limit.value])
 const query=useQuery({queryKey:key,enabled:computed(()=>!!userId.value),refetchInterval:15000,refetchOnWindowFocus:true,
  queryFn:async({signal})=>{const owner=userId.value;if(!owner)return {notifications:[],unreadCount:0,asOf:new Date().toISOString()} as Inbox;const data=await authFetch(`/api/profile-inbox?limit=${limit.value}`,{signal,headers:{'X-Profile-Id':owner}}) as Inbox;if(owner!==userId.value)throw new Error('Аккаунт изменился');return data}})
 const notifications=computed(()=>(query.data.value?.notifications||[]).map(n=>({...n,...notificationText(n,user.value?.hideScores===false),to:n.payload.to?.startsWith('/')&&!n.payload.to.startsWith('//')?n.payload.to:'/',avatarImg:n.actor?.avatar_img||null})))
 const unreadCount=computed(()=>query.data.value?.unreadCount||0)
 const mutation=useMutation({mutationFn:async(input:{clear?:boolean;ids?:string[];all?:boolean})=>{
  const owner=userId.value;if(!owner)return
  const asOf=query.data.value?.asOf;if(input.all&&!asOf)return
  await authFetch(`/api/profile-inbox/${input.clear?'clear':'read'}`,{method:'POST',headers:{'X-Profile-Id':owner},body:JSON.stringify(input.all?{all:true,before:asOf}:{ids:input.ids||[]})})
  if(owner===userId.value)await client.invalidateQueries({queryKey:['profile-inbox',owner]})
 },onMutate:()=>{actionError.value=''},onError:(e:Error)=>{actionError.value=e.message}})
 async function toggleOpen(){
  open.value=!open.value;if(!open.value)return
  const owner=userId.value,result=await query.refetch()
  if(owner!==userId.value||!open.value||result.error)return
  const ids=(result.data?.notifications||[]).filter(n=>!n.read_at).map(n=>n.id)
  if(ids.length)mutation.mutate({ids})
 }
 function openSettings(){open.value=false;settingsOpen.value=true}
 function visit(id:string){open.value=false;mutation.mutate({ids:[id]})}
 watch(userId,(_value,previous)=>{if(previous)client.removeQueries({queryKey:['profile-inbox',previous]});open.value=false;settingsOpen.value=false;limit.value=50;actionError.value=''})
 return {user,open,settingsOpen,openSettings,toggleOpen,visit,notifications,unreadCount,loading:query.isLoading,error:query.error,actionError,busy:mutation.isPending,
  retry:()=>query.refetch(),clear:()=>mutation.mutate({all:true,clear:true}),markAll:()=>mutation.mutate({all:true}),loadMore:()=>{limit.value=Math.min(500,limit.value+50)},canLoadMore:computed(()=>notifications.value.length>=limit.value&&limit.value<500)}
}

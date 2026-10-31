import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '../../../lib/supabase'
import { isRealtimeEnabled } from '../../../lib/realtime'
import { useAuthStore } from '../../../stores/auth'
import { authFetch } from '../../../api/authFetch'

export type GameComment = {
    id:string; game_id:string; user_id:string; message:string; image_data:string|null; reply_to_id:string|null; created_at:string
    profiles?:{first_name:string;last_name:string;avatar_img:string|null}|null
}
type RawGameComment=Omit<GameComment,'profiles'>&{profiles?:GameComment['profiles']|GameComment['profiles'][]}
type Snapshot={comments:GameComment[];readThrough:string}
type Context={gameId:string;userId:string}
type NewComment=Context&{message:string;imageData:string|null;replyToId:string|null}
const commentKey=(userId:string,gameId:string)=>['game-comments',userId,gameId]
const unreadKey=(userId:string,gameId:string)=>['game-comments-unread',userId,gameId]
const headers=(userId:string)=>({'X-Profile-Id':userId})
const normalize=(c:RawGameComment):GameComment=>({...c,profiles:Array.isArray(c.profiles)?c.profiles[0]??null:c.profiles??null})
const fileToDataUrl=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})

export function useGameComments(gameId:Ref<string>,active:Ref<boolean>) {
    const auth=useAuthStore(),queryClient=useQueryClient()
    const message=ref(''),imageData=ref<string|null>(null),imageName=ref(''),replyTo=ref<GameComment|null>(null),mutationError=ref<string|null>(null)
    const userId=computed(()=>auth.user?.id||''),key=computed(()=>commentKey(userId.value,gameId.value))
    const enabled=computed(()=>!!userId.value&&!!gameId.value&&active.value&&!auth.loading)
    const current=(c:Context)=>c.userId===userId.value&&c.gameId===gameId.value
    const query=useQuery({
        queryKey:key,enabled,staleTime:10000,gcTime:5*60000,retry:1,
        refetchInterval:()=>enabled.value?(isRealtimeEnabled()?30000:10000):false,refetchIntervalInBackground:false,
        queryFn:async({queryKey,signal}):Promise<Snapshot>=>{
            const owner=String(queryKey[1]),id=String(queryKey[2])
            if(!owner)return {comments:[],readThrough:''}
            const data=await authFetch(`/api/game-comments/${encodeURIComponent(id)}`,{signal,headers:headers(owner)})
            return {comments:((data.comments||[]) as RawGameComment[]).map(normalize),readThrough:data.readThrough||''}
        }
    })
    const comments=computed(()=>userId.value?[...(query.data.value?.comments||[])].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)):[])
    const loading=computed(()=>enabled.value&&query.isPending.value)
    const error=computed(()=>mutationError.value||query.error.value?.message||null)
    const canSend=computed(()=>enabled.value&&!!(message.value.trim()||imageData.value))
    const clearReplyTo=()=>{replyTo.value=null}
    const removeImage=()=>{imageData.value=null;imageName.value=''}
    async function fetchComments(){mutationError.value=null;if(enabled.value)await query.refetch()}

    let lastRead='',readPending=false,queuedRead=false,readGeneration=0
    async function markAsRead(){
        const through=query.data.value?.readThrough,c={userId:userId.value,gameId:gameId.value},generation=readGeneration
        if(!enabled.value||!through||through<=lastRead||document.hidden)return
        if(readPending){queuedRead=true;return}
        readPending=true
        try {
            await authFetch(`/api/game-comments/${encodeURIComponent(c.gameId)}/read`,{method:'PUT',headers:headers(c.userId),body:JSON.stringify({readThrough:through})})
            if(current(c)&&generation===readGeneration){lastRead=through;queryClient.setQueryData(unreadKey(c.userId,c.gameId),{count:0})}
        } catch(e:any){if(current(c)&&generation===readGeneration)mutationError.value=e.message||'Не удалось сохранить прочтение'}
        finally{if(generation===readGeneration){readPending=false;if(queuedRead){queuedRead=false;void markAsRead()}}}
    }
    async function attachImage(event:Event){
        const input=event.target as HTMLInputElement,file=input.files?.[0],c={userId:userId.value,gameId:gameId.value}
        if(!file)return
        input.value=''
        if(!enabled.value)return
        if(!file.type.startsWith('image/')){mutationError.value='Можно прикрепить только изображение';return}
        if(file.size>5*1024*1024){mutationError.value='Изображение должно быть меньше 5 МБ';return}
        try{const data=await fileToDataUrl(file);if(current(c)){imageData.value=data;imageName.value=file.name;mutationError.value=null}}catch{if(current(c))mutationError.value='Не удалось открыть изображение'}
    }
    const sendMutation=useMutation({
        mutationFn:async(c:NewComment)=>{
            if(!current(c)||!enabled.value)throw new Error('Аккаунт или игра изменились. Обновите комментарии.')
            const data=await authFetch('/api/game-comments',{method:'POST',headers:headers(c.userId),body:JSON.stringify({gameId:c.gameId,message:c.message,imageData:c.imageData,replyToId:c.replyToId})})
            if(!data.comment)throw new Error('Сервер не вернул сохранённый комментарий')
            return normalize(data.comment)
        },
        onSuccess:(inserted,c)=>{
            if(!current(c))return
            queryClient.setQueryData<Snapshot>(commentKey(c.userId,c.gameId),old=>({comments:[...(old?.comments||[]).filter(x=>x.id!==inserted.id),inserted],readThrough:old?.readThrough||''}))
            message.value='';removeImage();clearReplyTo();mutationError.value=null
        },
        onError:(e:any,c)=>{if(current(c))mutationError.value=e.message||'Не удалось отправить комментарий'}
    })
    async function sendComment(){
        if(!canSend.value||sendMutation.isPending.value)return
        mutationError.value=null
        try{await sendMutation.mutateAsync({gameId:gameId.value,userId:userId.value,message:message.value.trim(),imageData:imageData.value,replyToId:replyTo.value?.id??null})}catch{}
    }
    const deleteMutation=useMutation({
        mutationFn:async(c:Context&{id:string})=>{
            if(!current(c))throw new Error('Аккаунт или игра изменились')
            await authFetch(`/api/game-comments/${encodeURIComponent(c.id)}`,{method:'DELETE',headers:headers(c.userId)})
            return c
        },
        onSuccess:c=>{
            if(!current(c))return
            queryClient.setQueryData<Snapshot>(commentKey(c.userId,c.gameId),old=>old?{...old,comments:old.comments.filter(x=>x.id!==c.id)}:undefined)
            if(replyTo.value?.id===c.id)clearReplyTo()
        },
        onError:(e:any,c)=>{if(current(c))mutationError.value=e.message||'Не удалось удалить комментарий'}
    })
    async function deleteComment(comment:GameComment){
        if(deleteMutation.isPending.value||!enabled.value||(comment.user_id!==userId.value&&!auth.user?.isAdmin))return
        try{await deleteMutation.mutateAsync({id:comment.id,userId:userId.value,gameId:gameId.value})}catch{}
    }
    // Only the open, unlocked discussion owns a comments subscription.
    watch([enabled,userId,gameId],([allowed,owner,id],_,cleanup)=>{
        if(!allowed||!isRealtimeEnabled())return
        let timer:ReturnType<typeof setTimeout>|undefined
        const channel=supabase.channel(`game-comments-${owner}-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'game_comments',filter:`game_id=eq.${id}`},()=>{clearTimeout(timer);timer=setTimeout(()=>{void query.refetch()},200)}).subscribe()
        cleanup(()=>{clearTimeout(timer);void supabase.removeChannel(channel)})
    },{immediate:true})
    watch([userId,gameId],()=>{readGeneration++;readPending=false;queuedRead=false;lastRead='';message.value='';removeImage();clearReplyTo();mutationError.value=null})
    onUnmounted(()=>{readGeneration++})
    return {user:computed(()=>auth.user),comments,message,imageData,imageName,replyTo,loading,sending:sendMutation.isPending,deleting:deleteMutation.isPending,error,canSend,attachImage,removeImage,setReplyTo:(c:GameComment)=>{replyTo.value=c},clearReplyTo,sendComment,deleteComment,markAsRead,fetchComments}
}

export function useGameCommentsUnread(gameId:Ref<string>,active:Ref<boolean>) {
    const auth=useAuthStore(),client=useQueryClient(),userId=computed(()=>auth.user?.id||'')
    const key=computed(()=>unreadKey(userId.value,gameId.value)),enabled=computed(()=>!!userId.value&&!!gameId.value&&!auth.loading&&!active.value)
    const query=useQuery({queryKey:key,enabled,staleTime:15000,gcTime:5*60000,retry:1,refetchInterval:()=>enabled.value?30000:false,refetchIntervalInBackground:false,queryFn:async({queryKey,signal})=>{
        const owner=String(queryKey[1]),id=String(queryKey[2]);if(!owner)return {count:0}
        return await authFetch(`/api/game-comments/${encodeURIComponent(id)}/unread`,{signal,headers:headers(owner)}) as {count:number}
    }})
    watch([enabled,userId,gameId],([allowed,owner,id],_,cleanup)=>{
        if(!allowed||!isRealtimeEnabled())return
        let timer:ReturnType<typeof setTimeout>|undefined
        const channel=supabase.channel(`game-comments-unread-${owner}-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'game_comments',filter:`game_id=eq.${id}`},()=>{clearTimeout(timer);timer=setTimeout(()=>{void query.refetch()},200)}).subscribe()
        cleanup(()=>{clearTimeout(timer);void supabase.removeChannel(channel)})
    },{immediate:true})
    return {unreadCount:computed(()=>userId.value?query.data.value?.count||0:0),setUnreadCount:(count:number)=>{if(userId.value)client.setQueryData(key.value,{count})}}
}

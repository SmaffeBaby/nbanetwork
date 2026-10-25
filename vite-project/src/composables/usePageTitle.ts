import {watch,toValue,type MaybeRefOrGetter} from 'vue'
import {useRoute} from 'vue-router'
import {siteTitle,routeTitle} from '../utils/pageTitles'
export function usePageTitle(label:MaybeRefOrGetter<string|null|undefined>) {
 const route=useRoute(),owner=route.matched[route.matched.length-1]
 watch(()=>[route.matched[route.matched.length-1],route.fullPath,toValue(label)] as const,([record,_path,title])=>{
  if(record===owner)document.title=title?.trim()?siteTitle(title):routeTitle(route)
 },{immediate:true,flush:'post'})
}

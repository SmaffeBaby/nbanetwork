export type NotificationPreferences={activity:boolean;game_comments:boolean;articles:boolean;article_comments:boolean;actor_mode:'all'|'selected';actor_ids:string[];fantasy:boolean;game_results:boolean;result_favorites:boolean;result_teams:boolean;result_predictions:boolean}
export type InboxNotification={id:string;kind:'game_comment'|'article_published'|'article_comment'|'fantasy_lineup'|'fantasy_game'|'fantasy_final'|'game_result';created_at:string;read_at:string|null;actor:{id:string;first_name:string;last_name:string;avatar_img:string|null}|null;payload:{to?:string;day?:string;mode?:string;gameId?:string;matchup?:string;points?:number;rank?:number;homeScore?:number;awayScore?:number;winnerAbbr?:string}}
export type Inbox={notifications:InboxNotification[];unreadCount:number;asOf:string}
export function notificationText(n:InboxNotification,showScores:boolean){
 const mode=n.payload.mode==='balanced'?'Баланс-фентези':'Без ограничений'
 const names=[n.actor?.first_name,n.actor?.last_name].filter(Boolean).join(' ')||'Пользователь'
 const number=(value:number)=>Number(value).toLocaleString('ru-RU',{maximumFractionDigits:1})
 switch(n.kind){
  case 'game_comment':return {title:names,message:'Оставил комментарий к матчу',label:'Активность подписок'}
  case 'article_published':return {title:names,message:'Опубликовал статью',label:'Новая статья'}
  case 'article_comment':return {title:names,message:'Оставил комментарий к статье',label:'Активность подписок'}
  case 'fantasy_lineup':return {title:'Состав подтверждён',message:`${mode} · ${n.payload.day}`,label:'Фентези'}
  case 'fantasy_game':return {title:'Баллы за матч обработаны',message:showScores&&n.payload.points!==undefined?`${mode} · ${number(n.payload.points)} баллов`:`${mode} · откройте состав для подробностей`,label:n.payload.matchup||'Фентези'}
  case 'fantasy_final':return {title:'Итоги фентези готовы',message:showScores&&n.payload.points!==undefined?`${mode} · ${number(n.payload.points)} баллов · место #${n.payload.rank}`:`${mode} · ${n.payload.day}`,label:'Фентези'}
  case 'game_result':return {title:'Матч завершён',message:showScores&&n.payload.homeScore!==undefined&&n.payload.awayScore!==undefined?`${n.payload.matchup} · ${n.payload.awayScore} : ${n.payload.homeScore}`:`${n.payload.matchup||'Откройте матч'} · счёт скрыт`,label:'Исход матча'}
 }
}

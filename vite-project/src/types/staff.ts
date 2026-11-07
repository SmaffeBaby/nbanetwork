export type StaffRole='coach'|'executive'
export type StaffPerson={id:string;role:StaffRole;name:string;wins?:number|null;losses?:number|null}
export type StaffTeam={abbr:string;archiveAbbr:string;name:string;localLogo:boolean}
export type StaffStint={season:string;team:StaffTeam;position:'head'|'assistant'|'executive';games:number|null;wins:number|null;losses:number|null;divisionRank:number|null;playoffGames:number|null;playoffWins:number|null;playoffLosses:number|null;notes:string}
export type StaffProfile=StaffPerson & {birthDate:string|null;deathDate:string|null;photoId:string;stints:StaffStint[];history:{team:StaffTeam;position:StaffStint['position'];startYear:number;endYear:number;startSeason:string;endSeason:string}[];awards:{season:string;label:string}[];source:string}
export type TeamStaff={abbr:string;season:string;name:string;staff:StaffPerson[];wins:number|null;losses:number|null;conferenceRank:number|null;rankScope:'conference'|'division';conference:'east'|'west'|null;playoffResult:string;playoffPlace:number|null;source:string}
export type StaffSeason={season:string;results:{stint:StaffStint;result:TeamStaff|null}[]}
export const staffLocation=(role:StaffRole,id:string,season?:string)=>({name:role==='coach'?'CoachProfile':'ExecutiveProfile',params:{id},query:season?{season}:{}})
export const staffPosition=(position:StaffStint['position'])=>position==='assistant'?'Ассистент тренера':position==='executive'?'Руководитель клуба':'Главный тренер'

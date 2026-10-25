const statuses:Record<string,string>={Out:'Не сыграет',Doubtful:'Скорее не сыграет',Questionable:'Под вопросом',Probable:'Скорее сыграет','Day-To-Day':'Решение перед матчем',Suspension:'Дисквалификация',Suspended:'Дисквалификация'}
export const statusLabel=(status:string)=>statuses[status] || status
export const statLabels:Record<string,string>={avgPoints:'Очки',avgRebounds:'Подборы',avgAssists:'Передачи',avgSteals:'Перехваты',avgBlocks:'Блок-шоты',fieldGoalPct:'С игры, %',threePointPct:'Трёхочковые, %',freeThrowPct:'Штрафные, %'}
export const statValue=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value)

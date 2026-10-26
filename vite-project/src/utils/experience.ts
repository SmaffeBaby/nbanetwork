// Level N begins at 150 * N * (N - 1) XP. The next level costs 300 * N XP.
export const xpForLevel = (level: number) => 150 * Math.max(1, Math.floor(level)) * (Math.max(1, Math.floor(level)) - 1)
export function experienceLevel(totalXp: number) {
    const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0
    const level = Math.floor((1 + Math.sqrt(1 + xp / 37.5)) / 2)
    const start = xpForLevel(level), next = xpForLevel(level + 1)
    return { level, totalXp: xp, currentXp: xp - start, neededXp: next - start, nextXp: next, remainingXp: next - xp, percent: Math.min(100, (xp - start) / (next - start) * 100) }
}
export const xpTeamNames: Record<string, string> = {
    ATL: 'Атланта', BOS: 'Бостон', BKN: 'Бруклин', CHA: 'Шарлотт', CHI: 'Чикаго', CLE: 'Кливленд', DAL: 'Даллас', DEN: 'Денвер', DET: 'Детройт', GSW: 'Голден Стэйт', HOU: 'Хьюстон', IND: 'Индиана', LAC: 'Клипперс', LAL: 'Лейкерс', MEM: 'Мемфис', MIA: 'Майами', MIL: 'Милуоки', MIN: 'Миннесота', NOP: 'Нью-Орлеан', NYK: 'Нью-Йорк', OKC: 'Оклахома', ORL: 'Орландо', PHI: 'Филадельфия', PHX: 'Финикс', POR: 'Портленд', SAC: 'Сакраменто', SAS: 'Сан-Антонио', TOR: 'Торонто', UTA: 'Юта', WAS: 'Вашингтон'
}
export type ExperienceEvent = { id: number; kind: 'watched' | 'prediction'; game_id: string; points: number; created_at: string; details: Record<string, any> }
export function experienceLabel(event: ExperienceEvent) {
    const d = event.details
    const team = (side: string) => xpTeamNames[d[`${side}Abbr`]] || d[`${side}Name`] || d[`${side}Abbr`] || 'Команда'
    return event.kind === 'prediction' ? `победа ${team('winner')}` : `${team('away')} — ${team('home')}`
}

const VERSION = 1
const finite = value => typeof value === 'number' && Number.isFinite(value)
const fmt = value => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 })
const stat = (stats, key) => finite(stats?.[key]) ? stats[key] : null
const percent = (made, attempted) => attempted > 0 ? `${fmt(made / attempted * 100)}%` : 'без попыток'
const count = (value, words) => {
    const n = Math.abs(value), mod = n % 100
    return `${fmt(value)} ${words[mod >= 11 && mod <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2]}`
}
const pts = value => count(value, ['очко', 'очка', 'очков'])
function periodsFrom(recap) {
    return (recap.meta?.quarters || recap.quarters || []).map((raw, index) => {
        const match = String(raw).match(/^(?:[^:]+:\s*)?(\d+)\s*[-–]\s*(\d+)$/)
        return { label: index < 4 ? `Q${index + 1}` : `OT${index - 3}`, away: match ? Number(match[1]) : null, home: match ? Number(match[2]) : null }
    })
}
function completeFinal(recap) {
    const m = recap?.meta
    if (m?.status !== 'Final' || !finite(m.homeScore) || !finite(m.awayScore) || m.homeScore === m.awayScore || !m.homeAbbr || !m.awayAbbr) return false
    const periods = periodsFrom(recap)
    if (periods.length < 4 || periods.some(p => !finite(p.home) || !finite(p.away))) return false
    if (periods.reduce((n, p) => n + p.home, 0) !== m.homeScore || periods.reduce((n, p) => n + p.away, 0) !== m.awayScore) return false
    return ['home', 'away'].every(side => {
        const s = m.teamStats?.[side]
        return stat(s, 'fieldGoalsMade') !== null && stat(s, 'fieldGoalsAttempted') > 0 &&
            s.fieldGoalsMade <= s.fieldGoalsAttempted &&
            (recap.players?.[side] || []).some(p => !p.notPlayingReason && stat(p.statistics, 'points') !== null) &&
            (recap.players?.[side] || []).filter(p => !p.notPlayingReason).reduce((sum, p) => sum + (stat(p.statistics, 'points') || 0), 0) === m[`${side}Score`]
    })
}
function completePlays(recap) {
    const points = recap.meta?.leadTracker?.points || []
    if (!points.length || points[0].period !== 1) return []
    let home = 0, away = 0, elapsed = -1
    for (const p of points) {
        const dh = p.homeScore - home, da = p.awayScore - away
        if (!finite(p.elapsed) || p.elapsed < elapsed || dh < 0 || da < 0 || (dh > 0 && da > 0) || dh + da < 1 || dh + da > 4) return []
        home = p.homeScore; away = p.awayScore; elapsed = p.elapsed
    }
    return home === recap.meta.homeScore && away === recap.meta.awayScore ? points : []
}
function generateArticle(recap) {
    if (!completeFinal(recap)) return null
    const m = recap.meta, periods = periodsFrom(recap)
    const names = { away: m.awayTeam, home: m.homeTeam }
    const winner = m.homeScore > m.awayScore ? 'home' : 'away', loser = winner === 'home' ? 'away' : 'home'
    const scores = { home: m.homeScore, away: m.awayScore }
    const stats = m.teamStats, margin = Math.abs(m.homeScore - m.awayScore)
    const sections = []
    const add = (id, title, paragraphs) => { if (paragraphs.length) sections.push({ id, title, paragraphs }) }
    const cumulative = periods.map((_, i) => ({ home: periods.slice(0, i + 1).reduce((n, p) => n + p.home, 0), away: periods.slice(0, i + 1).reduce((n, p) => n + p.away, 0) }))
    const scoreline = p => `${m.awayAbbr} ${p.away}:${p.home} ${m.homeAbbr}`
    const best = periods.map((p, i) => ({ ...p, index: i, delta: p[winner] - p[loser] })).sort((a, b) => b.delta - a.delta || a.index - b.index)[0]
    const firstHalf = cumulative[1], secondHalf = { home: periods[2].home + periods[3].home, away: periods[2].away + periods[3].away }
    const leadPhrase = p => p.home === p.away ? 'команды шли вровень' : `${names[p.home > p.away ? 'home' : 'away']} вели с перевесом в ${pts(Math.abs(p.home - p.away))}`
    const keyPeriod = best.delta > 0 ? `Наиболее выгодным отрезком для победителей оказалась ${best.label}: ${best[winner]}:${best[loser]}, преимущество +${best.delta} за период.` : 'Победителей определила сумма результатов всех периодов.'
    const deck = `${names[winner]} выиграли ${scores[winner]}:${scores[loser]}. ${keyPeriod}`
    add('result', 'Что определило результат', [
        `${names.away} и ${names.home} завершили встречу со счётом ${m.awayScore}:${m.homeScore}${periods.length > 4 ? ` после ${count(periods.length - 4, ['дополнительного периода', 'дополнительных периодов', 'дополнительных периодов'])}` : ''}. ${keyPeriod} ${margin <= 5 ? `Итоговый перевес в ${pts(margin)} говорит о плотном результате: даже один удачный отрезок мог существенно изменить положение команд.` : `Итоговый перевес составил ${pts(margin)}, но отдельные четверти дают более точную картину, чем одна финальная разница.`}`,
        `К большому перерыву ${leadPhrase(firstHalf)} — ${scoreline(firstHalf)}. Вторую половину основного времени ${secondHalf[winner] > secondHalf[loser] ? `лучше провели ${names[winner]}` : secondHalf[winner] === secondHalf[loser] ? 'команды прошли на равных' : `лучше провели ${names[loser]}`}: ${scoreline(secondHalf)}.${periods.length > 4 ? ' При этом основное время закончилось вничью, и всё решилось в овертайме.' : secondHalf[winner] < secondHalf[loser] ? ' Однако созданного ранее запаса победителям хватило, чтобы довести встречу до победы.' : ''}`
    ])
    add('periods', 'Ход игры: от первой четверти до финальной сирены', periods.map((p, i) => {
        const quarterWinner = p.home === p.away ? null : p.home > p.away ? 'home' : 'away'
        const before = i ? cumulative[i - 1] : { away: 0, home: 0 }, after = cumulative[i]
        const oldDiff = before[winner] - before[loser], newDiff = after[winner] - after[loser]
        let effect = ''
        if (i > 0) {
            if (oldDiff < 0 && newDiff > 0) effect = ` Именно в этом периоде будущий победитель ${names[winner]} вышел вперёд по суммарному счёту.`
            else if (newDiff > oldDiff) effect = ` ${names[winner]} улучшили разницу за эту четверть на ${pts(newDiff - oldDiff)}.`
            else if (newDiff < oldDiff) effect = ` ${names[loser]} улучшили разницу за этот отрезок на ${pts(oldDiff - newDiff)}.`
            else effect = ' Разница в общем счёте за период не изменилась.'
        }
        return `${p.label}. ${quarterWinner ? `${names[quarterWinner]} выиграли отрезок` : 'Команды набрали поровну'} — ${scoreline(p)}. Суммарный счёт после периода — ${scoreline(after)}.${effect}`
    }))
    const shooting = []
    for (const side of ['away', 'home']) {
        const s = stats[side], parts = [`${s.fieldGoalsMade} из ${s.fieldGoalsAttempted} с игры (${percent(s.fieldGoalsMade, s.fieldGoalsAttempted)})`]
        if (stat(s, 'threePointersMade') !== null && stat(s, 'threePointersAttempted') !== null) parts.push(`трёхочковые — ${s.threePointersMade} из ${s.threePointersAttempted} (${percent(s.threePointersMade, s.threePointersAttempted)})`)
        if (stat(s, 'freeThrowsMade') !== null && stat(s, 'freeThrowsAttempted') !== null) parts.push(`штрафные — ${s.freeThrowsMade} из ${s.freeThrowsAttempted} (${percent(s.freeThrowsMade, s.freeThrowsAttempted)})`)
        shooting.push(`${names[side]}: ${parts.join('; ')}. ${s.threePointersAttempted > 0 ? `Из-за дуги команда выполнила ${percent(s.threePointersAttempted, s.fieldGoalsAttempted)} всех бросков с игры.` : ''}`)
    }
    if (['home', 'away'].every(side => stat(stats[side], 'threePointersMade') !== null)) {
        const efg = side => (stats[side].fieldGoalsMade + .5 * stats[side].threePointersMade) / stats[side].fieldGoalsAttempted * 100
        const gap = Math.abs(efg('home') - efg('away'))
        shooting.push(`С учётом дополнительной ценности трёхочковых эффективная точность бросков (eFG%) составила ${fmt(efg('away'))}% у ${m.awayAbbr} и ${fmt(efg('home'))}% у ${m.homeAbbr}. ${gap >= 0.1 ? `Преимущество ${gap < 3 ? 'по этому показателю было небольшим' : 'по бросковой эффективности было заметным'}: ${fmt(gap)} процентного пункта в пользу ${names[efg('home') > efg('away') ? 'home' : 'away']}.` : 'По этому показателю команды были практически равны.'}`)
        const threeDiff = (stats[winner].threePointersMade - stats[loser].threePointersMade) * 3
        if (threeDiff) shooting.push(`На трёхочковых ${names[threeDiff > 0 ? winner : loser]} набрали на ${pts(Math.abs(threeDiff))} больше соперника. ${threeDiff > 0 ? 'Этот компонент работал в пользу победителей.' : 'Дальние попадания помогали проигравшей команде держаться в игре, однако общий баланс других источников очков оказался в пользу соперника.'}`)
    }
    if (['home', 'away'].every(side => stat(stats[side], 'threePointersMade') !== null && stat(stats[side], 'threePointersAttempted') !== null)) {
        const twos = side => stats[side].fieldGoalsMade - stats[side].threePointersMade
        const attempts = side => stats[side].fieldGoalsAttempted - stats[side].threePointersAttempted
        shooting.push(`Двухочковые: ${m.awayAbbr} ${twos('away')} из ${attempts('away')} (${percent(twos('away'), attempts('away'))}), ${m.homeAbbr} ${twos('home')} из ${attempts('home')} (${percent(twos('home'), attempts('home'))}). В очках это ${twos('away') * 2}:${twos('home') * 2}. Сопоставление двухочковых, дальних бросков и штрафных показывает, за счёт каких завершений команды набирали свой итоговый счёт.`)
    }
    add('shooting', 'Структура атаки и цена каждого броска', shooting)
    const scoring = []
    for (const [key, label, explanation] of [
        ['pointsInThePaint', 'Очки в трёхсекундной зоне', 'Это вклад атак, завершённых близко к кольцу: здесь особенно важны проходы, завершения больших и движение к щиту.'],
        ['fastBreakPoints', 'Очки в быстрых отрывах', 'Такой набор очков отражает результативность перехода в атаку, пока защита соперника ещё не успела полностью выстроиться.'],
        ['freeThrowsMade', 'Попадания со штрафной линии', 'Штрафные добавляли очки без броска с игры и стали отдельной частью атакующего баланса.']
    ]) {
        const away = stat(stats.away, key), home = stat(stats.home, key)
        if (away === null || home === null) continue
        scoring.push(`${label}: ${m.awayAbbr} ${away}, ${m.homeAbbr} ${home}. ${away === home ? 'Здесь команды не получили преимущества друг над другом.' : `Перевес ${names[away > home ? 'away' : 'home']} составил ${pts(Math.abs(away - home))}.`} ${explanation}`)
    }
    add('scoring-areas', 'Кольцо, быстрые атаки и штрафная линия', scoring)
    const possessions = []
    for (const [key, title] of [['reboundsTotal', 'Подборы'], ['reboundsOffensive', 'Подборы в нападении'], ['turnovers', 'Потери'], ['assists', 'Передачи']]) {
        const away = stat(stats.away, key), home = stat(stats.home, key)
        if (away === null || home === null) continue
        let text = `${title}: ${m.awayAbbr} ${away}, ${m.homeAbbr} ${home}. `
        if (away === home) text += 'По количеству команды закончили на одном уровне.'
        else if (key === 'turnovers') text += `${names[away < home ? 'away' : 'home']} реже отдавали сопернику мяч из-за ошибок — разница составила ${Math.abs(away - home)}. Сохранение владений помогало команде доводить больше своих атак до завершения.`
        else if (key === 'reboundsOffensive') text += `${names[away > home ? 'away' : 'home']} чаще возвращали себе мяч после собственных промахов — перевес ${Math.abs(away - home)}. Это позволяло продлевать атаки и получать повторные попытки у чужого кольца.`
        else if (key === 'assists') text += `${names[away > home ? 'away' : 'home']} закончили матч с большим числом попаданий после передач партнёров. Для сравнения роли командного розыгрыша важно учитывать и общий объём реализованных бросков.`
        else text += `${names[away > home ? 'away' : 'home']} выиграли борьбу за отскок с перевесом ${Math.abs(away - home)}, лучше контролируя этот компонент игры.`
        possessions.push(text)
    }
    add('possessions', 'Борьба за владения и движение мяча', possessions)
    const players = []
    for (const side of ['away', 'home']) {
        const rows = (recap.players[side] || []).filter(p => !p.notPlayingReason && stat(p.statistics, 'points') !== null)
        const leaders = [...rows].sort((a, b) => b.statistics.points - a.statistics.points || (b.statistics.assists || 0) - (a.statistics.assists || 0)).slice(0, 3)
        if (!leaders.length) continue
        const descriptions = leaders.map(p => {
            const s = p.statistics, line = [pts(s.points)]
            if (stat(s, 'reboundsTotal') !== null) line.push(count(s.reboundsTotal, ['подбор', 'подбора', 'подборов']))
            if (stat(s, 'assists') !== null) line.push(count(s.assists, ['передача', 'передачи', 'передач']))
            if (stat(s, 'minutes') !== null) line.push(`${fmt(s.minutes)} мин.`)
            return `${p.name} — ${line.join(', ')}`
        })
        const topPoints = leaders.reduce((n, p) => n + p.statistics.points, 0)
        players.push(`${names[side]}. ${descriptions.join('; ')}. Эти ${leaders.length} ${leaders.length === 1 ? 'игрок' : 'игрока'} набрали ${pts(topPoints)} — ${percent(topPoints, scores[side])} общего результата команды. ${topPoints / scores[side] >= .65 ? 'Большая часть результативности была сосредоточена у лидеров.' : 'Заметная часть набора очков осталась и за остальными игроками ротации.'}`)
    }
    add('players', 'Лидеры и распределение нагрузки', players)
    const plays = completePlays(recap)
    if (plays.length) {
        let lastHome = 0, lastAway = 0, runSide = null, run = 0, bestRun = { points: 0 }, max = { home: 0, away: 0 }, changes = 0, lastLeader = null
        for (const p of plays) {
            const side = p.homeScore > lastHome ? 'home' : 'away'
            const gained = side === 'home' ? p.homeScore - lastHome : p.awayScore - lastAway
            run = side === runSide ? run + gained : gained; runSide = side
            if (run > bestRun.points) bestRun = { points: run, side, period: p.period, clock: p.clock }
            const diff = p.homeScore - p.awayScore, leader = diff > 0 ? 'home' : diff < 0 ? 'away' : null
            max.home = Math.max(max.home, diff); max.away = Math.max(max.away, -diff)
            if (leader && lastLeader && leader !== lastLeader) changes++
            if (leader) lastLeader = leader
            lastHome = p.homeScore; lastAway = p.awayScore
        }
        const late = [...plays].reverse().find(p => p.elapsed <= 2580)
        const flow = [`По ходу встречи лидер менялся ${count(changes, ['раз', 'раза', 'раз'])}. Максимальный перевес ${m.awayAbbr} достигал ${pts(max.away)}, ${m.homeAbbr} — ${pts(max.home)}. ${max[loser] === 0 ? `${names[loser]} ни разу не выходили вперёд по счёту.` : `Таким образом, обе команды имели отрезки, на которых владели инициативой по счёту.`}`,
            `Самая длинная серия без очков соперника — ${bestRun.points}:0 у ${names[bestRun.side]}. Она закончилась в ${bestRun.period <= 4 ? `Q${bestRun.period}` : `OT${bestRun.period - 4}`}${bestRun.clock ? ` при ${bestRun.clock} на таймере` : ''}. За этот рывок команда изменила разницу сразу на ${pts(bestRun.points)}.`]
        if (late) flow.push(`За пять минут до конца четвёртой четверти счёт был ${m.awayAbbr} ${late.awayScore}:${late.homeScore} ${m.homeAbbr}. За оставшееся основное время ${names.away} набрали ${pts(cumulative[3].away - late.awayScore)}, ${names.home} — ${pts(cumulative[3].home - late.homeScore)}.${periods.length > 4 ? ' Затем игра продолжилась в овертайме.' : ` К финальной сирене ${names[winner]} завершили встречу с преимуществом в ${pts(margin)}.`}`)
        add('turning-points', 'Рывки и заключительные минуты', flow)
    }
    const winnerFg = stats[winner].fieldGoalsMade / stats[winner].fieldGoalsAttempted, loserFg = stats[loser].fieldGoalsMade / stats[loser].fieldGoalsAttempted
    const edges = []
    if (stat(stats[winner], 'pointsInThePaint') !== null && stat(stats[loser], 'pointsInThePaint') !== null && stats[winner].pointsInThePaint > stats[loser].pointsInThePaint) edges.push('перевес в очках из трёхсекундной зоны')
    if (winnerFg > loserFg) edges.push('более высокая точность бросков с игры')
    if (stat(stats[winner], 'turnovers') !== null && stat(stats[loser], 'turnovers') !== null && stats[winner].turnovers < stats[loser].turnovers) edges.push('меньшее число потерь')
    if (stat(stats[winner], 'reboundsOffensive') !== null && stat(stats[loser], 'reboundsOffensive') !== null && stats[winner].reboundsOffensive > stats[loser].reboundsOffensive) edges.push('больше подборов на чужом щите')
    if (stat(stats[winner], 'freeThrowsMade') !== null && stat(stats[loser], 'freeThrowsMade') !== null && stats[winner].freeThrowsMade > stats[loser].freeThrowsMade) edges.push('больше реализованных штрафных')
    add('conclusion', 'Итог матча', [`В пользу ${names[winner]} в протоколе выделяются ${edges.length ? edges.join(', ') : `выигранные периоды, прежде всего ${best.label}`}. ${margin <= 5 ? 'При таком небольшом итоговом разрыве цена каждого попадания и сохранённого владения была особенно высокой.' : `Победители собрали перевес в ${pts(margin)} из результатов отдельных четвертей и преимуществ в нескольких компонентах. ${periods.some(p => p[loser] > p[winner]) ? 'Соперник забирал свои отрезки, однако этого не хватило, чтобы изменить итог встречи.' : 'Победители не проиграли ни одного периода и сохранили контроль над результатом.'}`}`])
    return {
        version: VERSION, title: `${names.away} — ${names.home}: разбор матча ${m.awayScore}:${m.homeScore}`,
        deck, sections, periods, teams: { away: { name: names.away, abbr: m.awayAbbr, score: m.awayScore }, home: { name: names.home, abbr: m.homeAbbr, score: m.homeScore } },
        dateUTC: recap.dateUTC, source: { name: 'ESPN', url: `https://www.espn.com/nba/game/_/gameId/${recap.gameId.slice(5)}` }, hasPlayByPlay: plays.length > 0
    }
}
module.exports = { generateArticle, completeFinal, periodsFrom, completePlays, VERSION }

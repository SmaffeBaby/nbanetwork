const TEAM_MAP = require('../constants/teamMap')

function pick(arr = []) {
    if (!Array.isArray(arr) || arr.length === 0) return null
    return arr[Math.floor(Math.random() * arr.length)]
}

const TEAM_BY_ABBR = {}
const TEAM_BY_NAME = {}

for (const id in TEAM_MAP) {
    const t = TEAM_MAP[id]
    TEAM_BY_ABBR[t.abbr] = t
    TEAM_BY_NAME[t.name] = t
}

function resolveTeam(input) {
    if (!input) return { abbr: 'UNK', name: 'Unknown' }

    if (TEAM_MAP[input]) return TEAM_MAP[input]
    if (TEAM_BY_ABBR[input]) return TEAM_BY_ABBR[input]
    if (TEAM_BY_NAME[input]) return TEAM_BY_NAME[input]

    return { abbr: 'UNK', name: input }
}

const playerUrl = (name) => `/player/${encodeURIComponent(name)}`
const teamUrl = (abbr) => `/team/${abbr}`

const teamLink = (input) => {
    const team = resolveTeam(input)
    return `<a href="${teamUrl(team.abbr)}">${team.name}</a>`
}

const playerLink = (name, label) =>
    `<a href="${playerUrl(name)}">${label}</a>`

function generateAIRecap({
                             homeTeam,
                             awayTeam,
                             homeScore,
                             awayScore,
                             topPlayers = [],
                             mvp,
                             runs,
                             clutch,
                             insight,
                             quarters
                         }) {
    const isHomeWinner = homeScore > awayScore

    const winner = isHomeWinner ? homeTeam : awayTeam
    const loser = isHomeWinner ? awayTeam : homeTeam

    const lead = topPlayers[0] || {}
    const second = topPlayers[1] || null

    const winLines = [
        `${teamLink(winner)} обыграли ${teamLink(loser)} со счётом ${homeScore}-${awayScore}`,
        `${teamLink(winner)} уверенно победили ${teamLink(loser)} (${homeScore}-${awayScore})`,
        `${teamLink(winner)} оказались сильнее ${teamLink(loser)}`,
        `${teamLink(winner)} вырвали победу у ${teamLink(loser)}`,
        `${teamLink(winner)} добились победы над ${teamLink(loser)}`
    ]

    const flowLines = [
        'после мощной второй половины',
        'за счёт рывка в концовке',
        'переломив игру в четвёртой четверти',
        'дожав соперника в концовке',
        'захватив инициативу во второй половине'
    ]

    const storyMain = `${pick(winLines)}, ${pick(flowLines)}`

    const performanceLines = lead?.name
        ? [
            `${playerLink(lead.name, lead.name)} стал главным героем матча, набрав ${lead.points ?? 0} очков`,
            `${playerLink(lead.name, lead.name)} провёл выдающуюся игру (${lead.points ?? 0} очков)`,
            `${playerLink(lead.name, lead.name)} доминировал на площадке с ${lead.points ?? 0} очками`
        ]
        : []

    const supportLines = second?.name
        ? [
            `${playerLink(second.name, second.name)} добавил ${second.points ?? 0} очков`,
            `${playerLink(second.name, second.name)} внёс важный вклад (${second.points ?? 0} очков)`
        ]
        : []

    const storyExtra = [
        pick(performanceLines),
        pick(supportLines)
    ].filter(Boolean).join(', ')

    const runLine = runs?.length
        ? (() => {
            const r = runs[0]
            const opponent = r.team === homeTeam ? awayTeam : homeTeam

            return `🔥 ${teamLink(r.team)} совершили рывок ${r.points}-0, не позволив ${teamLink(opponent)} набрать очки`
        })()
        : null

    const clutchLines = [
        'концовка решила исход матча',
        'решающие моменты остались за победителями',
        'игра решилась в последние минуты',
        'ключевые эпизоды в концовке перевернули матч',
        'команда дожала соперника в клатче'
    ]

    const finalClutch = clutch || pick(clutchLines)

    return {
        title: `${resolveTeam(winner).name} ${homeScore}-${awayScore} ${resolveTeam(loser).name}`,

        storyline: [storyMain, storyExtra].filter(Boolean),

        mvp: {
            name: mvp?.name || lead?.name || null,
            stats: mvp?.points != null
                ? `${mvp.points} очков / ${mvp.assists ?? 0} передач / ${mvp.rebounds ?? 0} подборов`
                : null
        },

        runs: runLine,
        clutch: finalClutch,
        insight: insight || 'Нет данных',
        quarters: Array.isArray(quarters) ? quarters : []
    }
}

module.exports = generateAIRecap
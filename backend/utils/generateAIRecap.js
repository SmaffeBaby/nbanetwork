function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function generateAIRecap({
                             homeTeam,
                             awayTeam,
                             homeScore,
                             awayScore,
                             topPlayers,
                             mvp,
                             runs,
                             clutch,
                             insight,
                             quarters
                         }) {
    const isHomeWinner = homeScore > awayScore

    const winner = isHomeWinner ? homeTeam : awayTeam
    const loser = isHomeWinner ? awayTeam : homeTeam

    const lead = topPlayers[0]
    const second = topPlayers[1]


    const winLines = [
        `${winner} defeated ${loser} ${homeScore}-${awayScore}`,
        `${winner} took down ${loser} ${homeScore}-${awayScore}`,
        `${winner} came out on top vs ${loser}`,
        `${winner} secured the win over ${loser}`
    ]

    const flowLines = [
        'after a strong second half',
        'with a late push',
        'pulling away in the 4th quarter',
        'closing the game with momentum'
    ]

    const performanceLines = [
        `${lead.name} led the way with ${lead.points} points`,
        `${lead.name} dominated with ${lead.points} pts`,
        `${lead.name} delivered a standout performance (${lead.points} pts)`
    ]

    const supportLines = second
        ? [
            `${second.name} added ${second.points} points`,
            `${second.name} provided key support (${second.points} pts)`
        ]
        : []

    const runLine = runs?.length
        ? `🔥 Biggest run: ${runs[0].points}-0`
        : null

    const clutchLines = [
        'late execution decided the game',
        'clutch plays sealed the win',
        'final minutes shifted momentum'
    ]


    return {
        title: `${winner} ${homeScore}-${awayScore} ${loser}`,

        storyline: [
            `${pick(winLines)}, ${pick(flowLines)}.`,
            pick(performanceLines),
            supportLines.length ? pick(supportLines) : null
        ].filter(Boolean),

        mvp: {
            name: mvp?.name,
            stats: `${mvp?.points} pts / ${mvp?.assists} ast / ${mvp?.rebounds} reb`
        },

        runs: runLine,

        clutch: clutch || pick(clutchLines),

        insight,

        quarters
    }
}

module.exports = generateAIRecap
const express = require('express')
const cors = require('cors')

const gamesRoutes = require('./routes/games')
const standingsRoutes = require('./routes/standings')
const playerStatsRoutes = require('./routes/playerStats')
const playerGameStatsRoutes = require('./routes/PlayerGameStats')
const teamGamesRoutes = require('./routes/teamGames')
const teamUpcomingGamesRoutes = require('./routes/teamUpcomingGames')
const gameDetailRoutes = require('./routes/gameDetail')
const gameRecapRoutes = require('./routes/gameRecap')
const dailyGamesRoute = require('./routes/dailyGames')
const playerImageRoute = require('./routes/playerImage')
const currentSeasonRoutes = require('./routes/currentSeason')
const playoffsRoutes = require('./routes/playoffs')
const playerCareerRoutes = require('./routes/playerCareer')
const translateRoutes = require('./routes/translate')


const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Backend работает!')
})

// routes
app.use('/api', gamesRoutes)
app.use('/api', standingsRoutes)
app.use('/api', playerStatsRoutes)
app.use('/api', playerGameStatsRoutes)
app.use('/api', teamGamesRoutes)
app.use('/api', teamUpcomingGamesRoutes)
app.use('/api', gameDetailRoutes)
app.use('/api', gameRecapRoutes)
app.use('/api', dailyGamesRoute)
app.use('/api', playerImageRoute)
app.use('/api', currentSeasonRoutes)
app.use('/api', playoffsRoutes)
app.use('/api', playerCareerRoutes)
app.use('/api', translateRoutes)


app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
})
const router = require('express').Router()
const { playIn } = require('../services/playIn')

router.get('/play-in/:year', async (req, res) => {
    const year = Number(req.params.year)
    const latest = new Date().getUTCFullYear() + 1
    if (!Number.isInteger(year) || year < 2021 || year > latest) return res.status(400).json({ error: `Доступны розыгрыши 2021–${latest} годов` })
    try { res.json(await playIn(year)) }
    catch (error) {
        console.warn('Play-in:', error.message)
        res.status(503).json({ error: 'Не удалось загрузить плей-ин. Попробуйте ещё раз.' })
    }
})

module.exports = router

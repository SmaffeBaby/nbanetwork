const router = require('express').Router()
const { draft } = require('../services/draft')

router.get('/draft/:year', async (req, res) => {
    const year = Number(req.params.year), latest = new Date().getUTCFullYear()
    if (!Number.isInteger(year) || year < 2003 || year > latest) return res.status(400).json({ error: `Доступны драфты 2003–${latest} годов` })
    try { res.json(await draft(year)) }
    catch (error) {
        console.warn('NBA Draft:', error.message)
        res.status(503).json({ error: 'Не удалось загрузить драфт этого года. Попробуйте ещё раз.' })
    }
})

module.exports = router

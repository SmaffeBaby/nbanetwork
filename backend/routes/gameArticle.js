const router = require('express').Router()
const { normalizeId } = require('../services/games/identity')
const { readOrCreateArticle } = require('../services/gameArticle/repository')
const { relatedGames } = require('../services/gameRelated')
function canonical(value) {
    const id = normalizeId(value)
    if (!id.startsWith('espn:')) throw new Error('ESPN ID required')
    return id
}
router.get('/game-article/:gameId', async (req, res) => {
    let id
    try { id = canonical(req.params.gameId) } catch { return res.status(400).json({ error: 'Некорректный ID матча' }) }
    try {
        const result = await readOrCreateArticle(id)
        if (!result) return res.status(202).set('Cache-Control', 'no-store').json({ article: null, message: 'Разбор появится после завершения матча и получения полного протокола.' })
        res.set('Cache-Control', 'public, max-age=300').json({ article: result.article, createdAt: result.created_at })
    } catch (error) {
        console.warn('Game article:', error.message)
        res.status(503).set('Cache-Control', 'no-store').json({ error: 'Не удалось загрузить разбор матча. Попробуйте ещё раз.' })
    }
})
router.get('/game-related/:gameId', async (req, res) => {
    let id
    try { id = canonical(req.params.gameId) } catch { return res.status(400).json({ error: 'Некорректный ID матча' }) }
    try { res.set('Cache-Control', 'no-store').json(await relatedGames(id)) }
    catch (error) {
        console.warn('Related games:', error.message)
        res.status(503).json({ error: 'Не удалось загрузить связанные матчи.' })
    }
})
module.exports = router

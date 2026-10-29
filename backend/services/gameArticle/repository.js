const { getAdmin } = require('../../lib/supabase')
const { getEspnGame } = require('../espnGameService')
const { generateArticle, VERSION } = require('./generate')
const pending = new Map()
function createArticleReader({ db, loadGame, generate = generateArticle }) {
    const read = async id => {
        const { data, error } = await db().from('game_recap_articles').select('game_id,article,created_at').eq('game_id', id).maybeSingle().abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        return data
    }
    return async function readOrCreate(id) {
        const saved = await read(id)
        if (saved) return saved
        const recap = await loadGame(id)
        const article = generate(recap)
        if (!article) return null
        const body = article.sections.map(section => `${section.title}\n\n${section.paragraphs.join('\n\n')}`).join('\n\n')
        const { error } = await db().from('game_recap_articles').upsert({ game_id: id, version: VERSION, title: article.title, body, article,
            source_snapshot: { meta: recap.meta, players: recap.players, dateUTC: recap.dateUTC } }, { onConflict: 'game_id', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        // Read the database winner even when another worker inserted first.
        const result = await read(id)
        if (!result) throw new Error('Article was not persisted')
        return result
    }
}
const reader = createArticleReader({ db: getAdmin, loadGame: getEspnGame })
function readOrCreateArticle(id) {
    if (pending.has(id)) return pending.get(id)
    const promise = reader(id).finally(() => pending.delete(id))
    pending.set(id, promise)
    return promise
}
module.exports = { readOrCreateArticle, createArticleReader }

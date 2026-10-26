const { getAdmin } = require('../lib/supabase')
const { resolveGameId } = require('./games/identity')
function startExperienceBackfill() {
    let running = false
    async function tick() {
        if (running) return
        running = true
        try {
            const db = getAdmin()
            const { data, error } = await db.from('profile_experience_backfill').select('*').lte('next_attempt_at', new Date().toISOString()).limit(10).abortSignal(AbortSignal.timeout(5000))
            if (error) throw error
            for (const row of data || []) {
                try {
                    const id = await resolveGameId(row.original_id, row.snapshot)
                    const { error } = await db.rpc('complete_experience_backfill', { p_user_id: row.user_id, p_original_id: row.original_id, p_game_id: id })
                    if (error) throw error
                } catch {
                    await db.from('profile_experience_backfill').update({ next_attempt_at: new Date(Date.now() + 3600000).toISOString() }).eq('user_id', row.user_id).eq('original_id', row.original_id)
                }
            }
        } catch (error) { console.warn('Experience backfill:', error.code || 'unavailable') }
        finally { running = false }
    }
    void tick()
    setInterval(tick, 60000).unref()
}
module.exports = { startExperienceBackfill }

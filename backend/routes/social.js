const express = require('express')
const { getAdmin } = require('../lib/supabase')
const { requireUser } = require('../middleware/auth')

const router = express.Router()

const MAX_COMMENT_IMAGE_SIZE = 1024 * 1024 * 8

function authorName(profile) {
    const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
    return name || 'Пользователь'
}

async function createCommentNotifications(comment) {
    try {
        const admin = getAdmin()
        const { data: followers, error } = await admin
            .from('profile_follows')
            .select(`
                follower_id,
                profiles:follower_id (
                    notify_followed_comments
                )
            `)
            .eq('following_id', comment.user_id)

        if (error) throw error

        const rows = (followers || [])
            .filter(row => row.follower_id !== comment.user_id)
            .filter(row => {
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
                return profile?.notify_followed_comments === true
            })
            .map(row => ({
                recipient_id: row.follower_id,
                actor_id: comment.user_id,
                game_id: comment.game_id,
                comment_id: comment.id
            }))

        if (rows.length === 0) return

        const { error: insertError } = await admin
            .from('profile_comment_notifications')
            .upsert(rows, { onConflict: 'recipient_id,comment_id' })

        if (insertError) throw insertError
    } catch (error) {
        console.error('create comment notifications error:', error)
    }
}

router.get('/game-comments/:gameId', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { gameId } = req.params

        const { data, error } = await admin
            .from('game_comments')
            .select(`
                id,
                game_id,
                user_id,
                message,
                image_data,
                reply_to_id,
                created_at,
                profiles:user_id (
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .eq('game_id', gameId)
            .order('created_at', { ascending: true })

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ comments: data || [] })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.post('/game-comments', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { id, gameId, message = '', imageData = null, replyToId = null } = req.body || {}
        const text = String(message || '').trim()

        if (!gameId) {
            return res.status(400).json({ error: 'gameId is required' })
        }

        if (!text && !imageData) {
            return res.status(400).json({ error: 'Comment is empty' })
        }

        if (imageData && String(imageData).length > MAX_COMMENT_IMAGE_SIZE) {
            return res.status(400).json({ error: 'Image is too large. Choose a file smaller than 5 MB.' })
        }

        let replyToIdValue = null
        if (replyToId) {
            replyToIdValue = String(replyToId)

            const { data: parentComment, error: parentError } = await admin
                .from('game_comments')
                .select('id')
                .eq('id', replyToIdValue)
                .eq('game_id', String(gameId))
                .maybeSingle()

            if (parentError) {
                return res.status(500).json({ error: parentError.message })
            }

            if (!parentComment) {
                return res.status(400).json({ error: 'Reply target not found' })
            }
        }

        const payload = {
            game_id: String(gameId),
            user_id: req.user.id,
            message: text,
            image_data: imageData,
            reply_to_id: replyToIdValue
        }

        if (id) payload.id = String(id)

        const { data, error } = await admin
            .from('game_comments')
            .insert(payload)
            .select(`
                id,
                game_id,
                user_id,
                message,
                image_data,
                reply_to_id,
                created_at,
                profiles:user_id (
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .single()

        if (error) {
            console.error('create game comment error:', {
                gameId,
                userId: req.user.id,
                message: error.message
            })
            return res.status(500).json({ error: error.message })
        }

        console.log('game comment created:', {
            id: data.id,
            gameId: data.game_id,
            userId: data.user_id
        })

        res.status(201).json({ comment: data })

        setImmediate(() => {
            void createCommentNotifications(data)
        })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.delete('/game-comments/:commentId', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { commentId } = req.params

        const { data: comment, error: commentError } = await admin
            .from('game_comments')
            .select('id, user_id')
            .eq('id', commentId)
            .maybeSingle()

        if (commentError) {
            return res.status(500).json({ error: commentError.message })
        }

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' })
        }

        const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('admin')
            .eq('id', req.user.id)
            .maybeSingle()

        if (profileError) {
            return res.status(500).json({ error: profileError.message })
        }

        const canDelete = comment.user_id === req.user.id || profile?.admin === true

        if (!canDelete) {
            return res.status(403).json({ error: 'You cannot delete this comment' })
        }

        const { error } = await admin
            .from('game_comments')
            .delete()
            .eq('id', commentId)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.get('/profile-notifications', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { data, error } = await admin
            .from('profile_comment_notifications')
            .select(`
                id,
                actor_id,
                game_id,
                comment_id,
                created_at,
                read_at,
                profiles:actor_id (
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .eq('recipient_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ notifications: data || [] })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.post('/profile-notifications/read', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { ids = [] } = req.body || {}
        const safeIds = Array.isArray(ids) ? ids.map(String).filter(Boolean) : []

        if (safeIds.length === 0) {
            return res.json({ ok: true })
        }

        const { error } = await admin
            .from('profile_comment_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('recipient_id', req.user.id)
            .in('id', safeIds)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.delete('/profile-notifications', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { ids = [] } = req.body || {}
        const safeIds = Array.isArray(ids) ? ids.map(String).filter(Boolean) : []

        let query = admin
            .from('profile_comment_notifications')
            .delete()
            .eq('recipient_id', req.user.id)

        if (safeIds.length > 0) {
            query = query.in('id', safeIds)
        }

        const { error } = await query

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

// Public social graph for signed-in visitors; return display fields only.
router.get('/profiles/:profileId/connections', requireUser, async (req, res) => {
    const { profileId } = req.params
    const { kind, offset = '0' } = req.query
    if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(profileId) ||
        (kind !== undefined && !['following', 'followers'].includes(kind)) ||
        typeof offset !== 'string' || !/^\d{1,7}$/.test(offset) || Number(offset) > 1000000) {
        return res.status(400).json({ error: 'Некорректный профиль или параметры списка' })
    }
    try {
        const db = getAdmin()
        const { data: profile, error: profileError } = await db.from('profiles').select('id').eq('id', profileId).maybeSingle().abortSignal(AbortSignal.timeout(8000))
        if (profileError) throw profileError
        if (!profile) return res.status(404).json({ error: 'Профиль не найден' })
        if (!kind) {
            const results = await Promise.all([
                db.from('profile_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId).abortSignal(AbortSignal.timeout(8000)),
                db.from('profile_follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId).abortSignal(AbortSignal.timeout(8000))
            ])
            for (const result of results) if (result.error) throw result.error
            return res.set('Cache-Control', 'no-store').json({ following: results[0].count || 0, followers: results[1].count || 0 })
        }
        const ownerColumn = kind === 'following' ? 'follower_id' : 'following_id'
        const targetColumn = kind === 'following' ? 'following_id' : 'follower_id'
        const { data, count, error } = await db.from('profile_follows')
            .select(`profile:${targetColumn}(id,first_name,last_name,avatar_img)`, { count: 'exact' })
            .eq(ownerColumn, profileId).order('created_at', { ascending: false }).order(targetColumn)
            .range(Number(offset), Number(offset) + 19).abortSignal(AbortSignal.timeout(8000))
        // PostgREST returns 416 when a page moves past the end after unfollowing.
        if (error?.code === 'PGRST103') {
            const total = await db.from('profile_follows').select('*', { count: 'exact', head: true }).eq(ownerColumn, profileId).abortSignal(AbortSignal.timeout(8000))
            if (total.error) throw total.error
            return res.set('Cache-Control', 'no-store').json({ profiles: [], total: total.count || 0 })
        }
        if (error) throw error
        res.set('Cache-Control', 'no-store').json({ profiles: data.map(row => Array.isArray(row.profile) ? row.profile[0] : row.profile).filter(Boolean), total: count || 0 })
    } catch (error) {
        console.warn('Profile connections:', error.message)
        res.status(503).json({ error: 'Не удалось загрузить подписки. Попробуйте ещё раз.' })
    }
})

router.get('/profile-follows', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { data, error } = await admin
            .from('profile_follows')
            .select(`
                following_id,
                created_at,
                profiles:following_id (
                    id,
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .eq('follower_id', req.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ follows: data || [] })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.get('/profile-follows/count', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { count, error } = await admin
            .from('profile_follows')
            .select('following_id', { count: 'exact', head: true })
            .eq('follower_id', req.user.id)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ count: count || 0 })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.post('/profile-follows/:profileId', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { profileId } = req.params

        if (!profileId || profileId === req.user.id) {
            return res.status(400).json({ error: 'Invalid profile id' })
        }

        const { error } = await admin
            .from('profile_follows')
            .upsert({
                follower_id: req.user.id,
                following_id: profileId
            }, { onConflict: 'follower_id,following_id' })

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

router.delete('/profile-follows/:profileId', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { profileId } = req.params

        const { error } = await admin
            .from('profile_follows')
            .delete()
            .eq('follower_id', req.user.id)
            .eq('following_id', profileId)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Social service is unavailable' })
    }
})

module.exports = router

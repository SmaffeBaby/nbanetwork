const express = require('express')
const { getAdmin } = require('../lib/supabase')
const { requireUser } = require('../middleware/auth')

const router = express.Router()

const MAX_COMMENT_IMAGE_SIZE = 1024 * 1024 * 1.4

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
        const { id, gameId, message = '', imageData = null } = req.body || {}
        const text = String(message || '').trim()

        if (!gameId) {
            return res.status(400).json({ error: 'gameId is required' })
        }

        if (!text && !imageData) {
            return res.status(400).json({ error: 'Comment is empty' })
        }

        if (imageData && String(imageData).length > MAX_COMMENT_IMAGE_SIZE) {
            return res.status(400).json({ error: 'Image is too large' })
        }

        const payload = {
            game_id: String(gameId),
            user_id: req.user.id,
            message: text,
            image_data: imageData
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

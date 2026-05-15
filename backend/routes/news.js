const express = require('express')
const { getAdmin } = require('../lib/supabase')
const { requireUser } = require('../middleware/auth')

const router = express.Router()

const MAX_CONTENT_LENGTH = 1024 * 1024 * 40
const MAX_COMMENT_IMAGE_SIZE = 1024 * 1024 * 8
const MAX_SLIDER_IMAGE_SIZE = 1024 * 1024 * 8

function normalizeText(value) {
    return String(value || '').trim()
}

function normalizeStringArray(value) {
    if (!Array.isArray(value)) return []

    return Array.from(
        new Set(
            value
                .map(item => normalizeText(item))
                .filter(Boolean)
        )
    )
}

function normalizeOptionalUrl(value) {
    const url = normalizeText(value)
    if (!url) return null
    if (/^(https?:\/\/|\/)/i.test(url)) return url
    return ''
}

function normalizePositiveInteger(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback
    const number = Number(value)
    if (!Number.isInteger(number) || number < 1) return null
    return number
}

function makeSlug(title) {
    const normalized = normalizeText(title)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')

    return `${normalized || 'news'}-${Date.now().toString(36)}`
}

async function requireAdmin(req, res) {
    const admin = getAdmin()

    const { data, error } = await admin
        .from('profiles')
        .select('admin')
        .eq('id', req.user.id)
        .maybeSingle()

    if (error) {
        res.status(500).json({ error: error.message })
        return null
    }

    if (data?.admin !== true) {
        res.status(403).json({ error: 'Only admins can manage news' })
        return null
    }

    return admin
}

function buildPayload(body, userId, existingArticle = null) {
    const title = normalizeText(body.title)
    const contentHtml = normalizeText(body.content_html)

    if (!title) {
        return { error: 'Title is required' }
    }

    if (!contentHtml) {
        return { error: 'Article content is required' }
    }

    if (contentHtml.length > MAX_CONTENT_LENGTH) {
        return { error: 'Article content is too large. Use images smaller than 5 MB.' }
    }

    return {
        payload: {
            author_id: existingArticle?.author_id || userId,
            title,
            slug: existingArticle?.slug || normalizeText(body.slug) || makeSlug(title),
            excerpt: normalizeText(body.excerpt),
            content_html: contentHtml,
            cover_image_url: normalizeText(body.cover_image_url) || null,
            game_ids: normalizeStringArray(body.game_ids),
            team_abbrs: normalizeStringArray(body.team_abbrs).map(item => item.toUpperCase()),
            hashtags: normalizeStringArray(body.hashtags),
            published: body.published !== false
        }
    }
}

function normalizeComment(row) {
    return {
        ...row,
        profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null
    }
}

function normalizeSliderItem(row) {
    return {
        ...row,
        mobile_image_url: row.mobile_image_url || null,
        sort_order: row.sort_order || 1,
        profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null
    }
}

async function reorderSliderItems(admin, targetId, requestedOrder) {
    const { data, error } = await admin
        .from('news_slider_items')
        .select('id, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) throw error

    const rows = data || []
    const target = rows.find(item => item.id === targetId)
    if (!target) return null

    const nextOrder = Math.min(Math.max(requestedOrder, 1), rows.length)
    const reordered = rows.filter(item => item.id !== targetId)
    reordered.splice(nextOrder - 1, 0, target)

    const updates = await Promise.all(
        reordered.map((item, index) => {
            const sortOrder = index + 1
            if (item.sort_order === sortOrder) return null
            return admin
                .from('news_slider_items')
                .update({ sort_order: sortOrder })
                .eq('id', item.id)
        }).filter(Boolean)
    )

    const failedUpdate = updates.find(result => result?.error)
    if (failedUpdate?.error) throw failedUpdate.error

    return nextOrder
}

async function fetchLikedArticles(userId) {
    const admin = getAdmin()
    const { data, error } = await admin
        .from('news_article_likes')
        .select(`
            created_at,
            news_articles:article_id (
                id,
                author_id,
                title,
                slug,
                excerpt,
                content_html,
                cover_image_url,
                game_ids,
                team_abbrs,
                hashtags,
                published,
                created_at,
                updated_at,
                profiles!news_articles_author_id_fkey (
                    first_name,
                    last_name,
                    avatar_img
                )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
        .map(row => Array.isArray(row.news_articles) ? row.news_articles[0] : row.news_articles)
        .filter(article => article?.published !== false)
}

async function createArticleNotifications(article) {
    if (!article?.published) return

    try {
        const admin = getAdmin()
        const { data: followers, error } = await admin
            .from('profile_follows')
            .select('follower_id')
            .eq('following_id', article.author_id)

        if (error) throw error

        const rows = (followers || [])
            .filter(row => row.follower_id !== article.author_id)
            .map(row => ({
                recipient_id: row.follower_id,
                actor_id: article.author_id,
                article_id: article.id,
                kind: 'article_published'
            }))

        if (rows.length === 0) return

        const { error: insertError } = await admin
            .from('profile_news_notifications')
            .upsert(rows, { onConflict: 'recipient_id,article_id,kind' })

        if (insertError) throw insertError
    } catch (error) {
        console.error('create article notifications error:', error)
    }
}

async function createArticleCommentNotifications(comment) {
    if (!comment?.id || !comment?.user_id || !comment?.article_id) return

    try {
        const admin = getAdmin()
        const { data: followers, error } = await admin
            .from('profile_follows')
            .select('follower_id')
            .eq('following_id', comment.user_id)

        if (error) throw error

        const rows = (followers || [])
            .filter(row => row.follower_id !== comment.user_id)
            .map(row => ({
                recipient_id: row.follower_id,
                actor_id: comment.user_id,
                article_id: comment.article_id,
                comment_id: comment.id,
                kind: 'article_comment'
            }))

        if (rows.length === 0) return

        const { error: insertError } = await admin
            .from('profile_news_notifications')
            .upsert(rows, { onConflict: 'recipient_id,comment_id,kind' })

        if (insertError) throw insertError
    } catch (error) {
        console.error('create article comment notifications error:', error)
    }
}

router.post('/news-articles', requireUser, async (req, res) => {
    try {
        const admin = await requireAdmin(req, res)
        if (!admin) return

        const { payload, error: payloadError } = buildPayload(req.body || {}, req.user.id)
        if (payloadError) {
            return res.status(400).json({ error: payloadError })
        }

        const { data, error } = await admin
            .from('news_articles')
            .insert(payload)
            .select('id, author_id, published')
            .single()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.status(201).json({ article: data })

        setImmediate(() => {
            void createArticleNotifications(data)
        })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News service is unavailable' })
    }
})

router.get('/news-slider', async (_req, res) => {
    try {
        const admin = getAdmin()
        const { data, error } = await admin
            .from('news_slider_items')
            .select(`
                id,
                image_url,
                mobile_image_url,
                link_url,
                sort_order,
                created_by,
                created_at,
                updated_at,
                profiles:created_by (
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(12)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ slides: (data || []).map(normalizeSliderItem) })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News slider service is unavailable' })
    }
})

router.post('/news-slider', requireUser, async (req, res) => {
    try {
        const admin = await requireAdmin(req, res)
        if (!admin) return

        const imageUrl = normalizeText(req.body?.image_url)
        const mobileImageUrl = normalizeText(req.body?.mobile_image_url) || null
        const linkUrl = normalizeOptionalUrl(req.body?.link_url)
        const sortOrder = normalizePositiveInteger(req.body?.sort_order, 1)

        if (!imageUrl) {
            return res.status(400).json({ error: 'Image is required' })
        }

        if (!sortOrder) {
            return res.status(400).json({ error: 'Sort order must be a positive integer' })
        }

        if (imageUrl.length > MAX_SLIDER_IMAGE_SIZE || (mobileImageUrl && mobileImageUrl.length > MAX_SLIDER_IMAGE_SIZE)) {
            return res.status(400).json({ error: 'Image is too large. Choose a file smaller than 5 MB.' })
        }

        if (linkUrl === '') {
            return res.status(400).json({ error: 'Link URL is invalid' })
        }

        const { data, error } = await admin
            .from('news_slider_items')
            .insert({
                image_url: imageUrl,
                mobile_image_url: mobileImageUrl,
                link_url: linkUrl,
                sort_order: sortOrder,
                created_by: req.user.id
            })
            .select('id, image_url, mobile_image_url, link_url, sort_order, created_by, created_at, updated_at')
            .single()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        await reorderSliderItems(admin, data.id, sortOrder)

        res.status(201).json({ slide: { ...data, sort_order: sortOrder } })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News slider service is unavailable' })
    }
})

router.patch('/news-slider/:id', requireUser, async (req, res) => {
    try {
        const admin = await requireAdmin(req, res)
        if (!admin) return

        const imageUrl = normalizeText(req.body?.image_url)
        const mobileImageUrl = normalizeText(req.body?.mobile_image_url) || null
        const linkUrl = normalizeOptionalUrl(req.body?.link_url)
        const sortOrder = normalizePositiveInteger(req.body?.sort_order, null)

        if (!imageUrl) {
            return res.status(400).json({ error: 'Image is required' })
        }

        if (sortOrder === null && req.body?.sort_order !== undefined) {
            return res.status(400).json({ error: 'Sort order must be a positive integer' })
        }

        if (imageUrl.length > MAX_SLIDER_IMAGE_SIZE || (mobileImageUrl && mobileImageUrl.length > MAX_SLIDER_IMAGE_SIZE)) {
            return res.status(400).json({ error: 'Image is too large. Choose a file smaller than 5 MB.' })
        }

        if (linkUrl === '') {
            return res.status(400).json({ error: 'Link URL is invalid' })
        }

        const { data, error } = await admin
            .from('news_slider_items')
            .update({
                image_url: imageUrl,
                mobile_image_url: mobileImageUrl,
                link_url: linkUrl,
                ...(sortOrder ? { sort_order: sortOrder } : {})
            })
            .eq('id', req.params.id)
            .select('id, image_url, mobile_image_url, link_url, sort_order, created_by, created_at, updated_at')
            .maybeSingle()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        if (!data) {
            return res.status(404).json({ error: 'Slide not found' })
        }

        const nextSortOrder = sortOrder ? await reorderSliderItems(admin, data.id, sortOrder) : data.sort_order

        res.json({ slide: { ...data, sort_order: nextSortOrder || data.sort_order } })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News slider service is unavailable' })
    }
})

router.delete('/news-slider/:id', requireUser, async (req, res) => {
    try {
        const admin = await requireAdmin(req, res)
        if (!admin) return

        const { error } = await admin
            .from('news_slider_items')
            .delete()
            .eq('id', req.params.id)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News slider service is unavailable' })
    }
})

router.get('/news-articles/by-slug/:slug', async (req, res) => {
    try {
        const admin = getAdmin()
        const slug = normalizeText(req.params.slug)

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
        let query = admin
            .from('news_articles')
            .select(`
                *,
                profiles!news_articles_author_id_fkey (
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .eq('published', true)

        query = isUuid ? query.or(`slug.eq.${slug},id.eq.${slug}`) : query.eq('slug', slug)

        const { data, error } = await query
            .maybeSingle()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        if (!data) {
            return res.status(404).json({ error: 'News article not found' })
        }

        res.json({ article: data })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News service is unavailable' })
    }
})

router.patch('/news-articles/:id', requireUser, async (req, res) => {
    try {
        const admin = await requireAdmin(req, res)
        if (!admin) return

        const { data: existingArticle, error: existingError } = await admin
            .from('news_articles')
            .select('id, author_id, slug')
            .eq('id', req.params.id)
            .maybeSingle()

        if (existingError) {
            return res.status(500).json({ error: existingError.message })
        }

        if (!existingArticle) {
            return res.status(404).json({ error: 'News article not found' })
        }

        const { payload, error: payloadError } = buildPayload(req.body || {}, req.user.id, existingArticle)
        if (payloadError) {
            return res.status(400).json({ error: payloadError })
        }

        const { data, error } = await admin
            .from('news_articles')
            .update(payload)
            .eq('id', req.params.id)
            .select('id, author_id, published')
            .single()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ article: data })

        setImmediate(() => {
            void createArticleNotifications(data)
        })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News service is unavailable' })
    }
})

router.delete('/news-articles/:id', requireUser, async (req, res) => {
    try {
        const admin = await requireAdmin(req, res)
        if (!admin) return

        const { error } = await admin
            .from('news_articles')
            .delete()
            .eq('id', req.params.id)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News service is unavailable' })
    }
})

router.get('/news-articles/:id/comments', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { data, error } = await admin
            .from('news_article_comments')
            .select(`
                id,
                article_id,
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
            .eq('article_id', req.params.id)
            .order('created_at', { ascending: true })

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ comments: (data || []).map(normalizeComment) })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News comments service is unavailable' })
    }
})

router.post('/news-articles/:id/comments', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { message = '', imageData = null, replyToId = null } = req.body || {}
        const text = normalizeText(message)

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
                .from('news_article_comments')
                .select('id')
                .eq('id', replyToIdValue)
                .eq('article_id', req.params.id)
                .maybeSingle()

            if (parentError) {
                return res.status(500).json({ error: parentError.message })
            }

            if (!parentComment) {
                return res.status(400).json({ error: 'Reply target not found' })
            }
        }

        const { data, error } = await admin
            .from('news_article_comments')
            .insert({
                article_id: req.params.id,
                user_id: req.user.id,
                message: text,
                image_data: imageData,
                reply_to_id: replyToIdValue
            })
            .select(`
                id,
                article_id,
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
            return res.status(500).json({ error: error.message })
        }

        res.status(201).json({ comment: normalizeComment(data) })

        setImmediate(() => {
            void createArticleCommentNotifications(data)
        })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News comments service is unavailable' })
    }
})

router.delete('/news-article-comments/:commentId', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { data: comment, error: commentError } = await admin
            .from('news_article_comments')
            .select('id, user_id')
            .eq('id', req.params.commentId)
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

        if (comment.user_id !== req.user.id && profile?.admin !== true) {
            return res.status(403).json({ error: 'You cannot delete this comment' })
        }

        const { error } = await admin
            .from('news_article_comments')
            .delete()
            .eq('id', req.params.commentId)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News comments service is unavailable' })
    }
})

router.get('/news-articles/:id/likes', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const [{ count, error }, { data: ownLike, error: ownError }] = await Promise.all([
            admin
                .from('news_article_likes')
                .select('article_id', { count: 'exact', head: true })
                .eq('article_id', req.params.id),
            admin
                .from('news_article_likes')
                .select('article_id')
                .eq('article_id', req.params.id)
                .eq('user_id', req.user.id)
                .maybeSingle()
        ])

        if (error || ownError) {
            return res.status(500).json({ error: error?.message || ownError?.message })
        }

        res.json({ count: count || 0, liked: Boolean(ownLike) })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News likes service is unavailable' })
    }
})

router.post('/news-articles/:id/likes', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { error } = await admin
            .from('news_article_likes')
            .upsert({
                article_id: req.params.id,
                user_id: req.user.id
            }, { onConflict: 'article_id,user_id' })

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News likes service is unavailable' })
    }
})

router.delete('/news-articles/:id/likes', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { error } = await admin
            .from('news_article_likes')
            .delete()
            .eq('article_id', req.params.id)
            .eq('user_id', req.user.id)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News likes service is unavailable' })
    }
})

router.get('/profile-liked-news', requireUser, async (req, res) => {
    try {
        res.json({ articles: await fetchLikedArticles(req.user.id) })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News likes service is unavailable' })
    }
})

router.get('/profiles/:id/liked-news', async (req, res) => {
    try {
        res.json({ articles: await fetchLikedArticles(String(req.params.id)) })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News likes service is unavailable' })
    }
})

router.get('/profile-news-notifications', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { data, error } = await admin
            .from('profile_news_notifications')
            .select(`
                id,
                actor_id,
                article_id,
                comment_id,
                kind,
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
        res.status(500).json({ error: error.message || 'News notifications service is unavailable' })
    }
})

router.post('/profile-news-notifications/read', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { ids = [] } = req.body || {}
        const safeIds = Array.isArray(ids) ? ids.map(String).filter(Boolean) : []

        if (safeIds.length === 0) {
            return res.json({ ok: true })
        }

        const { error } = await admin
            .from('profile_news_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('recipient_id', req.user.id)
            .in('id', safeIds)

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ ok: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'News notifications service is unavailable' })
    }
})

router.delete('/profile-news-notifications', requireUser, async (req, res) => {
    try {
        const admin = getAdmin()
        const { ids = [] } = req.body || {}
        const safeIds = Array.isArray(ids) ? ids.map(String).filter(Boolean) : []

        let query = admin
            .from('profile_news_notifications')
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
        res.status(500).json({ error: error.message || 'News notifications service is unavailable' })
    }
})

module.exports = router

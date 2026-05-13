const express = require('express')
const { getAdmin } = require('../lib/supabase')
const { requireUser } = require('../middleware/auth')

const router = express.Router()

const MAX_CONTENT_LENGTH = 1024 * 1024 * 1.5

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
        return { error: 'Article content is too large. Use image URLs or smaller images.' }
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
            hashtags: normalizeStringArray(body.hashtags),
            published: body.published !== false
        }
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
            .select('id')
            .single()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.status(201).json({ article: data })
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
            .select('id')
            .single()

        if (error) {
            return res.status(500).json({ error: error.message })
        }

        res.json({ article: data })
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

module.exports = router

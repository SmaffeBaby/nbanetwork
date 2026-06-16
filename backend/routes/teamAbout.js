const express = require('express')
const { getAdmin } = require('../lib/supabase')
const { requireUser } = require('../middleware/auth')

const router = express.Router()

const TABLE = 'team_about_pages'
const CACHE_TTL = 10 * 60 * 1000
const STORAGE_BUCKET = process.env.TEAM_ABOUT_STORAGE_BUCKET || process.env.SUPABASE_TEAM_ABOUT_BUCKET || '123'
const MAX_ASSET_BYTES = 6 * 1024 * 1024
const ALLOWED_ASSET_TYPES = new Set([
    'image/png',
    'image/svg+xml',
    'image/jpeg',
    'image/webp'
])
const cache = new Map()

function normalizeTeamAbbr(value) {
    return String(value || '').trim().toUpperCase()
}

function isValidTeamAbbr(value) {
    return /^[A-Z]{2,4}$/.test(value)
}

function cacheKey(teamAbbr) {
    return teamAbbr
}

function createRandomSuffix() {
    return Math.random().toString(36).slice(2, 10)
}

function sanitizeFileName(value, fallback = 'image') {
    const name = String(value || fallback)
        .replace(/\\/g, '/')
        .split('/')
        .pop()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return name || fallback
}

function extensionForContentType(contentType) {
    if (contentType === 'image/svg+xml') return 'svg'
    if (contentType === 'image/png') return 'png'
    if (contentType === 'image/jpeg') return 'jpg'
    if (contentType === 'image/webp') return 'webp'
    return 'bin'
}

function parseDataUrl(dataUrl) {
    const match = /^data:([^;,]+);base64,(.+)$/i.exec(String(dataUrl || ''))
    if (!match) return null

    return {
        contentType: match[1].toLowerCase(),
        buffer: Buffer.from(match[2], 'base64')
    }
}

function buildPublicStorageUrl(bucket, objectPath) {
    const configuredBase = process.env.TEAM_ABOUT_STORAGE_PUBLIC_BASE_URL
        || process.env.PUBLIC_STORAGE_BASE_URL

    if (configuredBase) {
        return `${configuredBase.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${objectPath}`
    }

    return `/storage/v1/object/public/${bucket}/${objectPath}`
}

function setCachedPage(teamAbbr, payload) {
    cache.set(cacheKey(teamAbbr), {
        payload,
        cachedAt: Date.now()
    })
}

function getCachedPage(teamAbbr) {
    const cached = cache.get(cacheKey(teamAbbr))
    if (!cached) return null

    if (Date.now() - cached.cachedAt > CACHE_TTL) {
        cache.delete(cacheKey(teamAbbr))
        return null
    }

    return cached.payload
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
        res.status(403).json({ error: 'Only admins can manage team about pages' })
        return null
    }

    return admin
}

router.get('/team-about/:abbr', async (req, res) => {
    const teamAbbr = normalizeTeamAbbr(req.params.abbr)
    if (!isValidTeamAbbr(teamAbbr)) {
        return res.status(400).json({ error: 'Invalid team abbreviation' })
    }

    const cached = getCachedPage(teamAbbr)
    if (cached) {
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
        res.set('X-Cache-Status', 'HIT')
        return res.json(cached)
    }

    try {
        const admin = getAdmin()
        const { data, error } = await admin
            .from(TABLE)
            .select('team_abbr, blocks, published, updated_at')
            .eq('team_abbr', teamAbbr)
            .eq('published', true)
            .maybeSingle()

        if (error) throw error

        const payload = data || {
            team_abbr: teamAbbr,
            blocks: [],
            published: true,
            updated_at: null
        }

        setCachedPage(teamAbbr, payload)
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
        res.set('X-Cache-Status', 'MISS')
        res.json(payload)
    } catch (error) {
        console.error('Failed to load team about page:', error)
        res.status(500).json({ error: 'Failed to load team about page' })
    }
})

router.put('/team-about/:abbr', requireUser, async (req, res) => {
    const teamAbbr = normalizeTeamAbbr(req.params.abbr)
    if (!isValidTeamAbbr(teamAbbr)) {
        return res.status(400).json({ error: 'Invalid team abbreviation' })
    }

    const admin = await requireAdmin(req, res)
    if (!admin) return

    const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks : []

    try {
        const { data, error } = await admin
            .from(TABLE)
            .upsert({
                team_abbr: teamAbbr,
                blocks,
                published: req.body?.published !== false,
                updated_at: new Date().toISOString(),
                updated_by: req.user.id
            }, { onConflict: 'team_abbr' })
            .select('team_abbr, blocks, published, updated_at')
            .single()

        if (error) throw error

        cache.delete(cacheKey(teamAbbr))
        setCachedPage(teamAbbr, data)
        res.set('X-Cache-Status', 'BYPASS')
        res.json(data)
    } catch (error) {
        console.error('Failed to save team about page:', error)
        res.status(500).json({ error: 'Failed to save team about page' })
    }
})

router.post('/team-about/:abbr/assets', requireUser, async (req, res) => {
    const teamAbbr = normalizeTeamAbbr(req.params.abbr)
    if (!isValidTeamAbbr(teamAbbr)) {
        return res.status(400).json({ error: 'Invalid team abbreviation' })
    }

    const admin = await requireAdmin(req, res)
    if (!admin) return

    const parsed = parseDataUrl(req.body?.dataUrl)
    if (!parsed) {
        return res.status(400).json({ error: 'Invalid image payload' })
    }

    const contentType = String(req.body?.contentType || parsed.contentType).toLowerCase()
    if (contentType !== parsed.contentType || !ALLOWED_ASSET_TYPES.has(contentType)) {
        return res.status(400).json({ error: 'Unsupported image type' })
    }

    if (parsed.buffer.length > MAX_ASSET_BYTES) {
        return res.status(413).json({ error: 'Изображение слишком большое. Выберите файл меньше 5 МБ.' })
    }

    const fileName = sanitizeFileName(req.body?.fileName, `image.${extensionForContentType(contentType)}`)
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(fileName)
    const finalFileName = hasExtension ? fileName : `${fileName}.${extensionForContentType(contentType)}`
    const objectPath = `team-about/${teamAbbr}/${Date.now()}-${createRandomSuffix()}-${finalFileName}`

    try {
        const { error } = await admin.storage
            .from(STORAGE_BUCKET)
            .upload(objectPath, parsed.buffer, {
                cacheControl: '31536000',
                contentType,
                upsert: false
            })

        if (error) throw error

        res.status(201).json({
            bucket: STORAGE_BUCKET,
            path: objectPath,
            url: buildPublicStorageUrl(STORAGE_BUCKET, objectPath)
        })
    } catch (error) {
        console.error('Failed to upload team about asset:', error)
        res.status(500).json({ error: 'Failed to upload image' })
    }
})

module.exports = router

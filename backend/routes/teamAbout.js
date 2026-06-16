const express = require('express')
const { getAdmin } = require('../lib/supabase')
const { requireUser } = require('../middleware/auth')

const router = express.Router()

const TABLE = 'team_about_pages'
const CACHE_TTL = 10 * 60 * 1000
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

module.exports = router

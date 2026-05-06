const crypto = require('crypto')
const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')
const translateText = require('../utils/translateText')

router.post('/translate', async (req, res) => {
    const source = normalizeLanguage(req.body?.source, 'en')
    const target = normalizeLanguage(req.body?.target, 'ru')
    const text = Array.isArray(req.body?.text) ? req.body.text : [req.body?.text]
    const lines = text
        .map(line => String(line || '').trim())
        .filter(Boolean)

    if (!lines.length) {
        return res.status(400).json({ error: 'Text is required' })
    }

    const totalChars = lines.reduce((total, line) => total + line.length, 0)
    if (lines.length > 40 || totalChars > 15000) {
        return res.status(413).json({ error: 'Text is too large to translate at once' })
    }

    try {
        const cacheHash = crypto
            .createHash('sha1')
            .update(JSON.stringify({ source, target, lines }))
            .digest('hex')

        const translated = await fetchWithCache({
            key: `translate:${source}:${target}:${cacheHash}`,
            ttl: 1000 * 60 * 60 * 24 * 7,
            staleWhileRevalidate: false,
            fetcher: () => translateText(lines, { source, target })
        })

        res.json({
            source,
            target,
            provider: getProviderName(),
            text: translated
        })
    } catch (err) {
        console.error('translate error:', err?.response?.data || err)
        res.status(502).json({ error: 'Failed to translate text' })
    }
})

function normalizeLanguage(value, fallback) {
    const language = String(value || fallback).toLowerCase()

    return /^[a-z]{2,5}$/.test(language) ? language : fallback
}

function getProviderName() {
    if (process.env.TRANSLATION_PROVIDER) return process.env.TRANSLATION_PROVIDER
    if (process.env.TRANSLATION_API_URL || process.env.TRANSLATION_API_KEY) return 'libretranslate'

    return 'google'
}

module.exports = router

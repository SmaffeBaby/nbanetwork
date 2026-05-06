const axios = require('axios')

const DEFAULT_TRANSLATION_API_URL = 'https://libretranslate.com/translate'

async function translateText(lines, options = {}) {
    const source = options.source || 'en'
    const target = options.target || 'ru'
    const input = normalizeLines(lines)

    if (!input.length) {
        return []
    }

    if (getProvider() === 'google') {
        const result = []
        for (const line of input) {
            result.push(await translateGoogleText(line, { source, target }))
        }

        return result
    }

    const translated = await translateBatch(input, { source, target })
    if (translated) return translated

    const result = []
    for (const line of input) {
        result.push(await translateSingle(line, { source, target }))
    }

    return result
}

async function translateBatch(lines, options) {
    try {
        const data = await requestTranslation(lines, options)
        const translated = parseTranslatedText(data, lines.length)

        return translated?.length === lines.length ? translated : null
    } catch {
        return null
    }
}

async function translateSingle(line, options) {
    const data = await requestTranslation(line, options)
    const translated = parseTranslatedText(data, 1)

    return translated?.[0] || line
}

async function requestTranslation(q, { source, target }) {
    const apiUrl = process.env.TRANSLATION_API_URL || DEFAULT_TRANSLATION_API_URL
    const apiKey = process.env.TRANSLATION_API_KEY || ''
    const payload = {
        q,
        source,
        target,
        format: 'text'
    }

    if (apiKey) {
        payload.api_key = apiKey
    }

    const response = await axios.post(apiUrl, payload, {
        timeout: 20000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })

    return response.data
}

async function translateGoogleText(text, { source, target }) {
    const chunks = splitText(text, 4500)
    const translated = []

    for (const chunk of chunks) {
        const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
            timeout: 20000,
            params: {
                client: 'gtx',
                sl: source,
                tl: target,
                dt: 't',
                q: chunk
            }
        })

        translated.push(parseGoogleTranslation(response.data) || chunk)
    }

    return translated.join('')
}

function parseGoogleTranslation(data) {
    if (!Array.isArray(data?.[0])) return ''

    return data[0]
        .map(part => Array.isArray(part) ? part[0] : '')
        .filter(Boolean)
        .join('')
}

function splitText(text, maxLength) {
    if (text.length <= maxLength) return [text]

    const chunks = []
    let remaining = text

    while (remaining.length > maxLength) {
        const slice = remaining.slice(0, maxLength)
        const boundary = Math.max(
            slice.lastIndexOf('. '),
            slice.lastIndexOf('! '),
            slice.lastIndexOf('? '),
            slice.lastIndexOf(', ')
        )
        const end = boundary > maxLength * 0.5 ? boundary + 2 : maxLength

        chunks.push(remaining.slice(0, end))
        remaining = remaining.slice(end)
    }

    if (remaining) chunks.push(remaining)

    return chunks
}

function parseTranslatedText(data, expectedCount) {
    if (typeof data?.translatedText === 'string') {
        return [data.translatedText]
    }

    if (Array.isArray(data?.translatedText)) {
        return data.translatedText.map(value => String(value || ''))
    }

    if (Array.isArray(data?.translations)) {
        return data.translations
            .map(item => item?.translatedText || item?.text || '')
            .filter(Boolean)
    }

    if (Array.isArray(data) && data.length === expectedCount) {
        return data.map(item => item?.translatedText || item?.text || String(item || ''))
    }

    return null
}

function normalizeLines(lines) {
    const input = Array.isArray(lines) ? lines : [lines]

    return input
        .map(line => String(line || '').trim())
        .filter(Boolean)
}

function getProvider() {
    if (process.env.TRANSLATION_PROVIDER) {
        return process.env.TRANSLATION_PROVIDER
    }

    return process.env.TRANSLATION_API_URL || process.env.TRANSLATION_API_KEY
        ? 'libretranslate'
        : 'google'
}

module.exports = translateText

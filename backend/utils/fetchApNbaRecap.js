const axios = require('axios')
const cheerio = require('cheerio')

const AP_NBA_HUB_URL = 'https://apnews.com/hub/nba'
const AP_ORIGIN = 'https://apnews.com'

const TEAM_ALIASES = {
    ATL: ['hawks', 'atlanta'],
    BKN: ['nets', 'brooklyn'],
    BOS: ['celtics', 'boston'],
    CHA: ['hornets', 'charlotte'],
    CHI: ['bulls', 'chicago'],
    CLE: ['cavaliers', 'cavs', 'cleveland'],
    DAL: ['mavericks', 'mavs', 'dallas'],
    DEN: ['nuggets', 'denver'],
    DET: ['pistons', 'detroit'],
    GSW: ['warriors', 'golden state'],
    HOU: ['rockets', 'houston'],
    IND: ['pacers', 'indiana'],
    LAC: ['clippers'],
    LAL: ['lakers'],
    MEM: ['grizzlies', 'memphis'],
    MIA: ['heat', 'miami'],
    MIL: ['bucks', 'milwaukee'],
    MIN: ['timberwolves', 'wolves', 'minnesota'],
    NOP: ['pelicans', 'new orleans'],
    NYK: ['knicks', 'new york'],
    OKC: ['thunder', 'oklahoma city'],
    ORL: ['magic', 'orlando'],
    PHI: ['76ers', 'sixers', 'philadelphia'],
    PHX: ['suns', 'phoenix'],
    POR: ['trail blazers', 'blazers', 'portland'],
    SAC: ['kings', 'sacramento'],
    SAS: ['spurs', 'san antonio'],
    TOR: ['raptors', 'toronto'],
    UTA: ['jazz', 'utah'],
    WAS: ['wizards', 'washington']
}

const AP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; nba-dashboard/1.0; +https://apnews.com/hub/nba)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

async function fetchApNbaRecap({ homeTeam, awayTeam, homeAbbr, awayAbbr, homeScore, awayScore }) {
    try {
        const hubRes = await axios.get(AP_NBA_HUB_URL, {
            headers: AP_HEADERS,
            timeout: 10000
        })

        const candidates = extractHubCandidates(hubRes.data)
            .map(candidate => ({
                ...candidate,
                score: scoreCandidate(candidate.title, {
                    homeTeam,
                    awayTeam,
                    homeAbbr,
                    awayAbbr,
                    homeScore,
                    awayScore
                })
            }))
            .filter(candidate => candidate.score >= 4)
            .sort((a, b) => b.score - a.score)

        if (!candidates.length) return null

        const article = await fetchApArticle(candidates[0].url)
        if (!article?.paragraphs?.length) return null

        return {
            ...article,
            source: 'AP News',
            sourceUrl: article.url,
            matchedTitle: candidates[0].title,
            matchScore: candidates[0].score
        }
    } catch (err) {
        console.warn('[ap nba recap unavailable]', err?.message || err)
        return null
    }
}

function extractHubCandidates(html) {
    const $ = cheerio.load(html)
    const seen = new Set()
    const candidates = []

    $('a[href*="/article/"]').each((_, element) => {
        const href = $(element).attr('href')
        const title = cleanText($(element).text())
        const url = toAbsoluteUrl(href)

        if (!url || !title || title.length < 20 || seen.has(url)) return

        seen.add(url)
        candidates.push({ title, url })
    })

    return candidates
}

async function fetchApArticle(url) {
    const articleRes = await axios.get(url, {
        headers: AP_HEADERS,
        timeout: 10000
    })

    const $ = cheerio.load(articleRes.data)
    const jsonLd = readJsonLd($)
    const title = cleanText($('h1').first().text()) || jsonLd?.headline || ''
    const byline = cleanText($('[rel="author"]').first().text())
        || cleanText($('a[href*="/author/"]').first().text())
        || extractByline($)
        || readMeta($, 'name', 'author')
        || jsonLd?.author?.name
        || ''
    const publishedAt = readMeta($, 'property', 'article:published_time')
        || readMeta($, 'property', 'article:modified_time')
        || jsonLd?.datePublished
        || jsonLd?.dateModified
        || ''
    const image = readMeta($, 'property', 'og:image') || jsonLd?.image?.url || jsonLd?.image || ''
    const paragraphs = extractArticleParagraphs($)

    return {
        title,
        byline,
        publishedAt,
        image,
        url,
        paragraphs
    }
}

function extractArticleParagraphs($) {
    const raw = $('article p, main p')
        .map((_, element) => cleanText($(element).text()))
        .get()
        .filter(Boolean)

    const unique = []
    const seen = new Set()

    for (const paragraph of raw) {
        const normalized = normalizeText(paragraph)
        if (
            seen.has(normalized)
            || paragraph.length < 35
            || isNonArticleText(paragraph)
        ) {
            continue
        }

        seen.add(normalized)
        unique.push(paragraph)
    }

    const apStart = unique.findIndex(paragraph => /\([A-Z\s.]*AP\)\s*[—-]/.test(paragraph))
    const paragraphs = apStart >= 0 ? unique.slice(apStart) : unique

    return paragraphs.slice(0, 12)
}

function extractByline($) {
    const bylineBlock = $('div, span, p')
        .map((_, element) => cleanText($(element).text()))
        .get()
        .find(text => /^By\s+[A-Z .'-]+($|\s+Updated)/.test(text))

    if (!bylineBlock) return ''

    return bylineBlock
        .replace(/\s+Updated.*$/, '')
        .trim()
}

function scoreCandidate(title, game) {
    const normalizedTitle = normalizeText(title)
    const scoreVariants = [
        `${game.homeScore}-${game.awayScore}`,
        `${game.awayScore}-${game.homeScore}`
    ]

    const homeMatched = teamAliases(game.homeTeam, game.homeAbbr)
        .some(alias => normalizedTitle.includes(alias))
    const awayMatched = teamAliases(game.awayTeam, game.awayAbbr)
        .some(alias => normalizedTitle.includes(alias))
    const scoreMatched = scoreVariants.some(score => normalizedTitle.includes(score))

    let score = 0
    if (homeMatched) score += 3
    if (awayMatched) score += 3
    if (scoreMatched) score += 4

    return score
}

function teamAliases(teamName, abbr) {
    const aliases = new Set(TEAM_ALIASES[abbr] || [])
    const name = normalizeText(teamName)

    if (name) {
        aliases.add(name)
        name.split(' ').forEach(part => {
            if (part.length > 2) aliases.add(part)
        })
    }

    return [...aliases]
}

function readJsonLd($) {
    const scripts = $('script[type="application/ld+json"]')
        .map((_, element) => $(element).contents().text())
        .get()

    for (const source of scripts) {
        try {
            const parsed = JSON.parse(source)
            const item = Array.isArray(parsed) ? parsed[0] : parsed
            if (item?.headline) return item
        } catch {
            // Ignore malformed structured data and fall back to DOM parsing.
        }
    }

    return null
}

function readMeta($, attr, key) {
    return $(`meta[${attr}="${key}"]`).attr('content') || ''
}

function toAbsoluteUrl(href) {
    if (!href) return ''
    if (href.startsWith('http')) return href
    if (href.startsWith('/')) return `${AP_ORIGIN}${href}`
    return ''
}

function cleanText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeText(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/[–—−]/g, '-')
}

function isNonArticleText(value) {
    const normalized = normalizeText(value)

    return [
        'add ap news',
        'share',
        'link copied',
        'related stories',
        'most read',
        'the associated press is an independent',
        'copyright '
    ].some(fragment => normalized.includes(fragment))
}

module.exports = fetchApNbaRecap

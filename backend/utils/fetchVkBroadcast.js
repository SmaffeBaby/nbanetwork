const axios = require('axios')
const cheerio = require('cheerio')
const TEAM_MAP = require('../constants/teamMap')

const VK_PLAYLIST_OWNER_ID = Number(process.env.VK_VIDEO_OWNER_ID || -202211208)
const VK_PLAYLIST_ID = Number(process.env.VK_VIDEO_PLAYLIST_ID || 8)
const VK_API_VERSION = process.env.VK_API_VERSION || '5.199'
const VK_VIDEO_CHANNEL = normalizeText(process.env.VK_VIDEO_CHANNEL || 'Взял Мяч')

const TEAM_ALIASES = {
    ATL: ['atl', 'hawks', 'atlanta', 'атланта', 'хокс'],
    BKN: ['bkn', 'nets', 'brooklyn', 'бруклин', 'нетс'],
    BOS: ['bos', 'celtics', 'boston', 'бостон', 'селтикс'],
    CHA: ['cha', 'hornets', 'charlotte', 'шарлотт', 'хорнетс'],
    CHI: ['chi', 'bulls', 'chicago', 'чикаго', 'буллз'],
    CLE: ['cle', 'cavaliers', 'cavs', 'cleveland', 'кливленд', 'кавалерс'],
    DAL: ['dal', 'mavericks', 'mavs', 'dallas', 'даллас', 'маверикс'],
    DEN: ['den', 'nuggets', 'denver', 'денвер', 'наггетс'],
    DET: ['det', 'pistons', 'detroit', 'детройт', 'пистонс'],
    GSW: ['gsw', 'warriors', 'golden state', 'голден стэйт', 'уорриорз', 'воины'],
    HOU: ['hou', 'rockets', 'houston', 'хьюстон', 'рокетс'],
    IND: ['ind', 'pacers', 'indiana', 'индиана', 'пэйсерс'],
    LAC: ['lac', 'clippers', 'la clippers', 'лос-анджелес клипперс', 'клипперс'],
    LAL: ['lal', 'lakers', 'los angeles lakers', 'лос-анджелес лейкерс', 'лейкерс'],
    MEM: ['mem', 'grizzlies', 'memphis', 'мемфис', 'гриззлис'],
    MIA: ['mia', 'heat', 'miami', 'майами', 'хит'],
    MIL: ['mil', 'bucks', 'milwaukee', 'милуоки', 'бакс'],
    MIN: ['min', 'timberwolves', 'wolves', 'minnesota', 'миннесота', 'тимбервулвз'],
    NOP: ['nop', 'pelicans', 'new orleans', 'нью-орлеан', 'пеликанс'],
    NYK: ['nyk', 'knicks', 'new york', 'нью-йорк', 'никс'],
    OKC: ['okc', 'thunder', 'oklahoma city', 'оклахома-сити', 'оклахома', 'тандер'],
    ORL: ['orl', 'magic', 'orlando', 'орландо', 'мэджик'],
    PHI: ['phi', '76ers', 'sixers', 'philadelphia', 'филадельфия', 'сиксерс'],
    PHX: ['phx', 'suns', 'phoenix', 'финикс', 'санс'],
    POR: ['por', 'trail blazers', 'blazers', 'portland', 'портленд', 'блэйзерс'],
    SAC: ['sac', 'kings', 'sacramento', 'сакраменто', 'кингз'],
    SAS: ['sas', 'spurs', 'san antonio', 'сан-антонио', 'спёрс', 'сперс'],
    TOR: ['tor', 'raptors', 'toronto', 'торонто', 'рэпторс'],
    UTA: ['uta', 'jazz', 'utah', 'юта', 'джаз'],
    WAS: ['was', 'wizards', 'washington', 'вашингтон', 'визардс']
}

async function fetchVkBroadcast(game) {
    const target = normalizeGameTarget(game)

    if (!target) {
        return {
            status: 'missing_game',
            message: 'Нет данных матча для поиска трансляции'
        }
    }

    let videos = []

    try {
        videos = await fetchPlaylistVideos(target)
    } catch (err) {
        videos = await fetchVideosFromSearch(target)

        if (!videos.length) {
            return {
                status: 'vk_error',
                message: `${getVkErrorMessage(err)} Публичный поиск по VK Video тоже ничего не нашёл.`,
                playlistUrl: getPlaylistUrl(),
                target
            }
        }
    }

    if (!process.env.VK_ACCESS_TOKEN && !videos.length) {
        videos = await fetchVideosFromSearch(target)
    }

    const candidates = videos
        .map(video => ({
            ...video,
            match: scoreVideo(video, target)
        }))
        .filter(video => video.match.channelMatched && video.match.score >= 11)
        .sort((a, b) => b.match.score - a.match.score)

    const best = candidates[0] || null

    if (!best) {
        return {
            status: 'not_found',
            message: `Трансляция для этого матча не найдена в VK Video playlist. Ищем ролики канала "${process.env.VK_VIDEO_CHANNEL || 'Взял Мяч'}" по обеим командам и дате МСК.`,
            playlistUrl: getPlaylistUrl(),
            target
        }
    }

    return {
        status: 'found',
        playlistUrl: getPlaylistUrl(),
        target,
        video: {
            ownerId: best.ownerId,
            id: best.id,
            title: best.title,
            description: best.description,
            publishedAt: best.publishedAt,
            publishedAtMSK: best.publishedAtMSK,
            duration: best.duration,
            thumbnail: best.thumbnail,
            url: best.url,
            embedUrl: best.embedUrl
        },
        match: best.match,
        alternatives: candidates.slice(1, 4).map(video => ({
            title: video.title,
            url: video.url,
            publishedAtMSK: video.publishedAtMSK,
            score: video.match.score
        }))
    }
}

async function fetchPlaylistVideos(target) {
    if (process.env.VK_ACCESS_TOKEN) {
        return fetchPlaylistVideosFromApi()
    }

    return fetchVideosFromSearch(target)
}

async function fetchPlaylistVideosFromApi() {
    const videos = []
    const count = 200

    for (let offset = 0; offset < 1000; offset += count) {
        const response = await axios.get('https://api.vk.com/method/video.getFromAlbum', {
            timeout: 15000,
            params: {
                owner_id: VK_PLAYLIST_OWNER_ID,
                album_id: VK_PLAYLIST_ID,
                offset,
                count,
                extended: 1,
                access_token: process.env.VK_ACCESS_TOKEN,
                v: VK_API_VERSION
            }
        })

        if (response.data?.error) {
            const error = new Error(response.data.error.error_msg || 'VK API error')
            error.vkError = response.data.error
            throw error
        }

        const items = response.data?.response?.items || []
        videos.push(...items.map(normalizeApiVideo))

        if (items.length < count) break
    }

    return videos
}

function getVkErrorMessage(err) {
    const code = err?.vkError?.error_code
    const message = err?.vkError?.error_msg || err?.message || 'VK API error'

    if (/service token/i.test(message)) {
        return 'VK отклонил сервисный ключ: метод video.getFromAlbum недоступен с service token. Нужен пользовательский access token с правом video.'
    }

    if (code === 5 || /authorization failed|token required/i.test(message)) {
        return 'VK отклонил токен. Для video.getFromAlbum нужен пользовательский access token с правами video, сервисный ключ приложения обычно не подходит.'
    }

    if (code === 15 || /access denied/i.test(message)) {
        return 'VK запретил доступ к плейлисту для этого токена. Проверьте, что это пользовательский access token с правом video и доступом к нужному плейлисту.'
    }

    return `VK API error: ${message}`
}

async function fetchPlaylistVideosFromPublicHtml() {
    const response = await axios.get('https://m.vk.com/video/playlist/-202211208_8', {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; nba-dashboard/1.0)'
        }
    })

    const $ = cheerio.load(response.data)
    const videos = []

    $('a[href*="/video-"], a[href*="z=video-"]').each((_, element) => {
        const href = $(element).attr('href') || ''
        const title = cleanText($(element).text())
        const ids = href.match(/video(-?\d+)_(\d+)/)

        if (!ids || !title) return

        videos.push(normalizeApiVideo({
            owner_id: Number(ids[1]),
            id: Number(ids[2]),
            title,
            date: null,
            player: ''
        }))
    })

    return dedupeVideos(videos)
}

async function fetchVideosFromSearch(target) {
    const queries = buildSearchQueries(target)
    const videos = []

    for (const query of queries) {
        const found = await fetchDuckDuckGoVideos(query)
        videos.push(...found)

        if (videos.length >= 8) break
    }

    return dedupeVideos(videos)
}

async function fetchDuckDuckGoVideos(query) {
    const response = await axios.get('https://duckduckgo.com/html/', {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; nba-dashboard/1.0)'
        },
        params: {
            q: query
        }
    })
    const $ = cheerio.load(response.data)
    const results = new Map()

    $('a').each((_, element) => {
        const href = decodeSearchUrl($(element).attr('href') || '')
        const ids = href.match(/video(-?\d+)_(\d+)/)
        const text = cleanText($(element).text())

        if (!ids || !/vk(video)?\.ru|vk\.com/.test(href)) return

        const key = `${ids[1]}_${ids[2]}`
        const current = results.get(key) || {
            owner_id: Number(ids[1]),
            id: Number(ids[2]),
            title: '',
            description: '',
            date: null,
            player: '',
            source: 'duckduckgo'
        }

        if (text && !looksLikeUrl(text)) {
            if (!current.title || text.length < current.title.length) {
                current.title = text
            } else {
                current.description = [current.description, text].filter(Boolean).join(' ')
            }
        }

        results.set(key, current)
    })

    return [...results.values()]
        .filter(video => video.title || video.description)
        .map(video => normalizeApiVideo(video))
}

function buildSearchQueries(target) {
    const home = pickSearchAlias(target.home.aliases)
    const away = pickSearchAlias(target.away.aliases)
    const date = target.dateTokens.find(token => /^\d{2}\.\d{2}\.\d{2}$/.test(token))
        || target.dateTokens[1]
        || target.dateMSK.dateISO
    const channel = process.env.VK_VIDEO_CHANNEL || 'Взял Мяч'
    const core = [home, away, channel, date].filter(Boolean).join(' ')

    return [
        `site:vksport.vkvideo.ru/video ${core}`,
        `site:vkvideo.ru/video ${core}`,
        `site:vk.com/video ${core}`,
        `vkvideo ${core}`
    ]
}

function pickSearchAlias(aliases) {
    return aliases.find(alias => /[а-я]/i.test(alias) && alias.length > 3)
        || aliases.find(alias => alias.length > 3)
        || aliases[0]
}

function normalizeApiVideo(video) {
    const ownerId = Number(video.owner_id || video.ownerId || VK_PLAYLIST_OWNER_ID)
    const id = Number(video.id)
    const publishedAt = video.date ? new Date(Number(video.date) * 1000).toISOString() : null
    const image = Array.isArray(video.image) ? video.image : []
    const thumbnail = image
        .slice()
        .sort((a, b) => Number(b.width || 0) - Number(a.width || 0))[0]?.url
        || video.photo_800
        || video.photo_640
        || video.photo_320
        || ''
    const embedUrl = video.player || buildEmbedUrl(ownerId, id, video.access_key)

    return {
        ownerId,
        id,
        title: cleanText(video.title),
        description: cleanText(video.description),
        source: video.source || 'vk',
        duration: Number(video.duration || 0),
        publishedAt,
        publishedAtMSK: publishedAt ? formatDateMSK(new Date(publishedAt)) : null,
        thumbnail,
        url: `https://vkvideo.ru/video${ownerId}_${id}`,
        embedUrl
    }
}

function scoreVideo(video, target) {
    const haystack = normalizeText(`${video.title} ${video.description}`)
    const channelMatched = VK_VIDEO_CHANNEL
        ? haystack.includes(VK_VIDEO_CHANNEL) || (video.source === 'duckduckgo' && video.ownerId === VK_PLAYLIST_OWNER_ID)
        : true
    const homeMatched = target.home.aliases.some(alias => haystack.includes(alias))
    const awayMatched = target.away.aliases.some(alias => haystack.includes(alias))
    const scoreMatched = target.scoreVariants.some(score => haystack.includes(score))
    const titleDateMatched = target.dateTokens.some(token => haystack.includes(token))
    const publishedDateMatched = Boolean(video.publishedAtMSK?.dateISO === target.dateMSK.dateISO)
    const publishedNear = video.publishedAt
        ? Math.abs(new Date(video.publishedAt).getTime() - target.gameTimeUTC) <= 1000 * 60 * 60 * 18
        : false

    let score = 0
    if (channelMatched) score += 4
    if (homeMatched) score += 4
    if (awayMatched) score += 4
    if (scoreMatched) score += 2
    if (titleDateMatched) score += 3
    if (publishedDateMatched) score += 3
    if (publishedNear) score += 2
    if (/матч\s*№|\bgame\s*#?\d+/i.test(haystack)) score += 2
    if (/хайлайты|обзор матча|highlights/i.test(haystack)) score -= 4

    return {
        score,
        channelMatched,
        homeMatched,
        awayMatched,
        scoreMatched,
        titleDateMatched,
        publishedDateMatched,
        publishedNear
    }
}

function normalizeGameTarget(game) {
    const homeAbbr = game?.home?.abbr || game?.homeAbbr
    const awayAbbr = game?.away?.abbr || game?.awayAbbr
    const homeName = game?.home?.name || game?.homeTeam
    const awayName = game?.away?.name || game?.awayTeam
    const dateUTC = game?.dateUTC

    if (!homeAbbr || !awayAbbr || !dateUTC) return null

    const homeScore = game?.home?.score ?? game?.homeScore
    const awayScore = game?.away?.score ?? game?.awayScore
    const gameDate = new Date(dateUTC)
    const dateMSK = formatDateMSK(gameDate)

    return {
        home: {
            abbr: homeAbbr,
            name: homeName,
            aliases: buildAliases(homeAbbr, homeName)
        },
        away: {
            abbr: awayAbbr,
            name: awayName,
            aliases: buildAliases(awayAbbr, awayName)
        },
        dateUTC,
        dateMSK,
        gameTimeUTC: gameDate.getTime(),
        scoreVariants: buildScoreVariants(homeScore, awayScore),
        dateTokens: buildDateTokens(dateMSK)
    }
}

function buildAliases(abbr, teamName) {
    const aliases = new Set(TEAM_ALIASES[abbr] || [])
    const meta = Object.values(TEAM_MAP).find(team => team.abbr === abbr)

    ;[teamName, meta?.name, abbr].forEach(value => {
        const normalized = normalizeText(value)
        if (!normalized) return
        aliases.add(normalized)
        normalized.split(' ').forEach(part => {
            if (part.length > 2) aliases.add(part)
        })
    })

    return [...aliases].filter(Boolean)
}

function buildScoreVariants(homeScore, awayScore) {
    if (homeScore == null || awayScore == null) return []

    return [
        `${homeScore}-${awayScore}`,
        `${awayScore}-${homeScore}`,
        `${homeScore}:${awayScore}`,
        `${awayScore}:${homeScore}`
    ]
}

function buildDateTokens(dateMSK) {
    const [year, month, day] = dateMSK.dateISO.split('-')
    const shortYear = year.slice(2)
    const monthName = [
        '',
        'января',
        'февраля',
        'марта',
        'апреля',
        'мая',
        'июня',
        'июля',
        'августа',
        'сентября',
        'октября',
        'ноября',
        'декабря'
    ][Number(month)]

    return [
        `${day}.${month}.${year}`,
        `${day}.${month}.${shortYear}`,
        `${Number(day)}.${Number(month)}.${year}`,
        `${Number(day)}.${Number(month)}.${shortYear}`,
        `${day}/${month}/${year}`,
        `${year}-${month}-${day}`,
        `${Number(day)} ${monthName}`
    ].map(normalizeText)
}

function formatDateMSK(date) {
    const parts = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).formatToParts(date)
    const get = type => parts.find(part => part.type === type)?.value || ''

    return {
        dateISO: `${get('year')}-${get('month')}-${get('day')}`,
        label: `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')} МСК`
    }
}

function buildEmbedUrl(ownerId, id, accessKey) {
    const params = new URLSearchParams({
        oid: String(ownerId),
        id: String(id),
        hd: '2'
    })

    if (accessKey) {
        params.set('hash', accessKey)
    }

    return `https://vkvideo.ru/video_ext.php?${params.toString()}`
}

function decodeSearchUrl(href) {
    if (!href) return ''

    try {
        const url = href.startsWith('//')
            ? new URL(`https:${href}`)
            : href.startsWith('http')
                ? new URL(href)
                : new URL(href, 'https://duckduckgo.com')
        const uddg = url.searchParams.get('uddg')

        return uddg ? decodeURIComponent(uddg) : url.toString()
    } catch {
        return href
    }
}

function looksLikeUrl(value) {
    return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\//i.test(value)
}

function getPlaylistUrl() {
    return `https://vkvideo.ru/playlist/${VK_PLAYLIST_OWNER_ID}_${VK_PLAYLIST_ID}`
}

function dedupeVideos(videos) {
    const seen = new Set()

    return videos.filter(video => {
        const key = `${video.ownerId}_${video.id}`
        if (seen.has(key)) return false

        seen.add(key)
        return true
    })
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
        .replace(/ё/g, 'е')
}

module.exports = fetchVkBroadcast

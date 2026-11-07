const express = require('express')
const { getAdmin } = require('../lib/supabase')

const router = express.Router()
const bucketName = 'player-images'
const maxBytes = 2 * 1024 * 1024
const pending = new Map()
let bucketReady

function imageSource(playerId) {
    const staff=/^staff:(coach|executive):([a-z0-9]{3,24})$/.exec(playerId)
    if (staff) return require('../services/staffProfiles').staffImageSource(staff[1],staff[2])
    if (/^\d{1,12}$/.test(playerId)) {
        return { name: `nba-${playerId}.png`, type: 'image/png', url: `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png` }
    }
    const espn = /^espn:(\d{1,12})$/.exec(playerId)
    if (espn) {
        return { name: `espn-${espn[1]}.png`, type: 'image/png', url: `https://a.espncdn.com/i/headshots/nba/players/full/${espn[1]}.png` }
    }
    const bbref = /^bbref:([a-z0-9]{1,24})$/.exec(playerId)
    if (bbref) {
        return { name: `bbref-${bbref[1]}.jpg`, type: 'image/jpeg', url: `https://www.basketball-reference.com/req/202106291/images/headshots/${bbref[1]}.jpg` }
    }
    return null
}

function currentSeason() {
    const date = new Date()
    const year = date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0)
    return `${year}-${String(year + 1).slice(-2)}`
}

function validSeason(season) {
    const match = /^(19\d{2}|20\d{2})-(\d{2})$/.exec(season)
    return match && String(Number(match[1]) + 1).slice(-2) === match[2] && season <= currentSeason()
}

function missing(error) {
    return error.status === 404 || ['404', 'NoSuchKey', 'NoSuchBucket'].includes(String(error.statusCode))
}

function storageBucket() {
    if (!bucketReady) {
        bucketReady = (async () => {
            const storage = getAdmin().storage
            const { error } = await storage.getBucket(bucketName)
            if (error) {
                if (!missing(error)) throw error
                const created = await storage.createBucket(bucketName, {
                    public: false, fileSizeLimit: maxBytes, allowedMimeTypes: ['image/png', 'image/jpeg']
                })
                if (created.error && (await storage.getBucket(bucketName)).error) throw created.error
            }
            return storage.from(bucketName)
        })().catch(error => {
            bucketReady = undefined
            throw error
        })
    }
    return bucketReady
}

const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex')
const jpegSignature = Buffer.from('ffd8ff', 'hex')
function isImage(buffer, type) {
    const signature = type === 'image/png' ? pngSignature : jpegSignature
    return buffer.subarray(0, signature.length).equals(signature)
}

async function downloadImage(source) {
    const url = new URL(source.url)
    const archiveReader = process.env.BASKETBALL_REFERENCE_READER_URL
    const throughReader = archiveReader && url.hostname === 'www.basketball-reference.com'
    let target = source.url
    if (throughReader) {
        const internal = new URL(archiveReader)
        internal.pathname = '/internal/basketball-reference-image'
        internal.search = new URLSearchParams({path:url.pathname}).toString()
        target = internal.toString()
    }
    const response = await fetch(target, { signal: AbortSignal.timeout(throughReader ? 25000 : 8000), redirect: 'error' })
    if (response.status === 404 || response.status === 410) {
        await response.body?.cancel()
        return null
    }
    if (!response.ok || !response.body) {
        await response.body?.cancel()
        throw new Error(`Image source returned ${response.status}`)
    }
    const chunks = []
    let bytes = 0
    const reader = response.body.getReader()
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            bytes += value.byteLength
            if (bytes > maxBytes) {
                await reader.cancel()
                throw new Error('Player image exceeds size limit')
            }
            chunks.push(value)
        }
    } finally {
        reader.releaseLock()
    }
    const buffer = Buffer.concat(chunks, bytes)
    if (!isImage(buffer, source.type)) throw new Error('Invalid player image')
    return buffer
}

async function loadImage(path, source) {
    let bucket
    try {
        bucket = await storageBucket()
        const { data, error } = await bucket.download(path, {}, { signal: AbortSignal.timeout(5000) })
        if (!error) return { buffer: Buffer.from(await data.arrayBuffer()), stored: true }
        if (!missing(error)) throw error
    } catch (error) {
        console.warn('Player image storage read:', error.message)
        bucket = undefined
    }

    const buffer = await downloadImage(source)
    if (!buffer) return null
    if (bucket) {
        const { error } = await bucket.upload(path, buffer, { contentType: source.type, cacheControl: '2592000', upsert: false })
        if (!error || error.status === 409 || ['409', 'Duplicate', 'KeyAlreadyExists'].includes(String(error.statusCode))) {
            return { buffer, stored: true }
        }
        console.warn('Player image storage write:', error.message)
    }
    return { buffer, stored: false }
}

async function serveImage(req, res) {
    let source
    try { source = await imageSource(req.params.playerId) }
    catch (error) { console.warn('Staff image source:',error.message);return res.status(502).set('Cache-Control','no-store').end() }
    const season = req.params.season ?? currentSeason()
    if (!source || !validSeason(season)) return res.status(400).set('Cache-Control', 'no-store').end()
    if (!req.params.season) {
        return res.set('Cache-Control', 'no-store').redirect(`/api/player-image/${req.params.playerId}/${season}`)
    }

    const path = `${source.folder || 'Players'}/${season}/${source.name}`
    if (!pending.has(path)) pending.set(path, loadImage(path, source).finally(() => pending.delete(path)))
    try {
        const image = await pending.get(path)
        if (!image) return res.status(404).set('Cache-Control', 'public, max-age=300').end()
        return res.type(source.type)
            .set('Cache-Control', image.stored ? 'public, max-age=2592000, immutable' : 'public, max-age=60')
            .send(image.buffer)
    } catch (error) {
        console.warn('Player image proxy:', error.message)
        return res.status(502).set('Cache-Control', 'no-store').end()
    }
}

router.get(['/player-image/:playerId', '/player-image/:playerId/:season'], serveImage)

module.exports = router

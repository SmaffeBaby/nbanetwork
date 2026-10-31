const router = require('express').Router()
const sitemap = require('../services/sitemap')

router.get('/robots.txt', (req, res) => {
    res.set('Cache-Control', 'public, max-age=600').type('text/plain').send(sitemap.robots)
})
router.get(['/sitemap.xml', '/sitemaps/:file'], async (req, res) => {
    try {
        const match = /^([a-z]+)-([1-9]\d*)\.xml$/.exec(req.params.file || '')
        const xml = req.path === '/sitemap.xml' ? await sitemap.index() : match ? await sitemap.page(match[1], Number(match[2])) : null
        if (xml === null) return res.status(404).type('text/plain').send('Sitemap not found')
        res.set('Cache-Control', 'public, max-age=600').type('application/xml').send(xml)
    } catch (error) {
        console.error('Sitemap unavailable:', error.message)
        res.set('Cache-Control', 'no-store').set('Retry-After', '60').status(503).type('text/plain').send('Sitemap temporarily unavailable')
    }
})
module.exports = router

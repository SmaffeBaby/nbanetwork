const express = require('express')
const router = express.Router()

router.get('/player-image/:playerId', async (req, res) => {
    const { playerId } = req.params

    const url = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`

    try {
        const response = await fetch(url)

        if (!response.ok) {
            return res.redirect(url)
        }

        const buffer = Buffer.from(await response.arrayBuffer())

        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

        res.status(200).send(buffer)

    } catch (err) {
        console.error('Image proxy error:', err)
        res.redirect(url)
    }
})

module.exports = router
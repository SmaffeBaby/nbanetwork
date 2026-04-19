const express = require('express')
const router = express.Router()

router.get('/player-image/:teamId/:playerId', async (req, res) => {
    const { teamId, playerId } = req.params

    const url = `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/${teamId}/2025/260x190/${playerId}.png`

    try {
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error('Image not found')
        }

        res.set('Cache-Control', 'public, max-age=31536000, immutable')

        res.set('Content-Type', 'image/png')

        response.body.pipe(res)
    } catch (e) {
        res.redirect(`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`)
    }
})

module.exports = router
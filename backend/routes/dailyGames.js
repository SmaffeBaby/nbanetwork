const express = require('express')
const router = express.Router()
const axios = require('axios')

const fetchWithCache = require('../utils/fetchWithCache')
const fetchDailyGames = require('../utils/fetchDailyGames')

router.get('/games/by-date/:date', async (req, res) => {
    const { date } = req.params

    try {
        const response = await axios.get(
            `http://python-backend:8000/games/by-date/${date}`
        )

        res.json(response.data)
    } catch (e) {
        console.error(e)
        res.status(500).json([])
    }
})

module.exports = router
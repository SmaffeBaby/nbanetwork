const fetchWithCache = require('../utils/fetchWithCache')

const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args))

const API_BASE = 'https://api.balldontlie.io/v1/'
const API_KEY = '4a7b83cf-4698-43e6-b480-3ac157221c66'

const ONE_HOUR = 1000 * 60 * 60

async function getGamesByDate(dateStr) {
    const key = `games_${dateStr}`

    return fetchWithCache({
        key,
        ttl: ONE_HOUR,
        fetcher: async () => {
            const url = `${API_BASE}games?dates[]=${dateStr}`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`
                }
            })

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const json = await response.json()
            return json.data || []
        }
    })
}

module.exports = {
    getGamesByDate
}
const cache = require('../cache/cache')

async function fetchWithCache({ key, ttl, fetcher }) {
    const cached = cache.get(key)

    if (cached) {
        console.log('📦 cache hit:', key)

        // обновление в фоне
        fetcher()
            .then(data => cache.set(key, data, ttl))
            .catch(err => console.error('Background update error:', err))

        return cached
    }

    const data = await fetcher()
    cache.set(key, data, ttl)

    return data
}

module.exports = fetchWithCache
const cache = require('../cache/cache')

const pendingRequests = new Map()

async function fetchWithCache({ key, ttl, fetcher, staleWhileRevalidate = true }) {
    const cached = cache.get(key)

    if (cached) {
        console.log('📦 cache hit:', key)

        if (staleWhileRevalidate && !pendingRequests.has(key)) {
            const pending = fetcher()
                .then(data => cache.set(key, data, ttl))
                .catch(err => console.error('Background update error:', err))
                .finally(() => pendingRequests.delete(key))

            pendingRequests.set(key, pending)
        }

        return cached
    }

    const pending = pendingRequests.get(key)
    if (pending) return pending

    const request = fetcher()
        .then(data => {
            cache.set(key, data, ttl)
            return data
        })
        .finally(() => pendingRequests.delete(key))

    pendingRequests.set(key, request)

    return request
}

module.exports = fetchWithCache
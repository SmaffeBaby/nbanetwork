class Cache {
    constructor() {
        this.store = new Map()
    }

    get(key) {
        const entry = this.store.get(key)

        if (!entry) return null

        const { data, expiresAt } = entry

        if (Date.now() > expiresAt) {
            this.store.delete(key)
            return null
        }

        return data
    }

    set(key, data, ttlMs) {
        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
        })
    }

    delete(key) {
        this.store.delete(key)
    }

    clear() {
        this.store.clear()
    }
}

module.exports = new Cache()
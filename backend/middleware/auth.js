const { userClient } = require('../lib/supabase')

async function requireUser(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
        console.warn('auth middleware: missing bearer token', {
            path: req.originalUrl
        })
        return res.status(401).json({ error: 'Unauthorized' })
    }

    let supabase
    let data
    let error

    try {
        supabase = userClient(token)
        const result = await supabase.auth.getUser(token)
        data = result.data
        error = result.error
    } catch (requestError) {
        console.error('auth middleware error:', requestError)
        return res.status(500).json({ error: 'Auth service is unavailable' })
    }

    if (error || !data?.user) {
        console.warn('auth middleware: invalid bearer token', {
            path: req.originalUrl,
            error: error?.message || 'No user'
        })
        return res.status(401).json({ error: 'Unauthorized' })
    }

    req.accessToken = token
    req.supabase = supabase
    req.user = data.user
    next()
}

module.exports = {
    requireUser
}

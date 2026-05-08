const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

let adminClient = null

function getConfig() {
    const supabaseUrl = process.env.SUPABASE_URL
        || process.env.SUPABASE_PUBLIC_URL
        || process.env.VITE_SUPABASE_URL
        || 'http://127.0.0.1:8010'
    const anonKey = process.env.SUPABASE_ANON_KEY
        || process.env.ANON_KEY
        || process.env.VITE_SUPABASE_ANON_KEY
        || ''
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        || process.env.SERVICE_ROLE_KEY
        || ''

    return {
        supabaseUrl,
        anonKey,
        serviceRoleKey
    }
}

function getAdmin() {
    if (adminClient) return adminClient

    const { supabaseUrl, anonKey, serviceRoleKey } = getConfig()
    const key = serviceRoleKey || anonKey

    if (!key) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY or SUPABASE_ANON_KEY/ANON_KEY is required')
    }

    adminClient = createClient(supabaseUrl, key, {
        realtime: {
            transport: WebSocket
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    })

    return adminClient
}

function userClient(accessToken) {
    const { supabaseUrl, anonKey } = getConfig()

    if (!anonKey) {
        throw new Error('SUPABASE_ANON_KEY/ANON_KEY is required')
    }

    return createClient(supabaseUrl, anonKey, {
        realtime: {
            transport: WebSocket
        },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    })
}

module.exports = {
    getAdmin,
    userClient
}

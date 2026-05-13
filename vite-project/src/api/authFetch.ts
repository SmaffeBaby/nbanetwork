import { supabase } from '../lib/supabase'
import {
    clearAccessToken,
    getAccessToken as getCachedAccessToken,
    setAccessToken
} from './authToken'

const SESSION_TIMEOUT_MS = 1200
const REQUEST_TIMEOUT_MS = 10000

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            window.setTimeout(() => reject(new Error(message)), ms)
        })
    ])
}

async function getAccessToken() {
    const cachedToken = getCachedAccessToken()
    if (cachedToken) return cachedToken

    try {
        const { data } = await withTimeout(
            supabase.auth.getSession(),
            SESSION_TIMEOUT_MS,
            'Supabase session timeout'
        )

        setAccessToken(data.session?.access_token)
        return data.session?.access_token ?? null
    } catch {
        return null
    }
}

async function refreshAccessToken() {
    try {
        const { data } = await withTimeout(
            supabase.auth.refreshSession(),
            2500,
            'Supabase refresh timeout'
        )

        setAccessToken(data.session?.access_token)
        return data.session?.access_token ?? null
    } catch {
        clearAccessToken()
        return null
    }
}

async function requestJson(path: string, options: RequestInit, token: string | null) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const headers = new Headers(options.headers)
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json')

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    let response: Response

    try {
        response = await fetch(path, {
            ...options,
            headers,
            signal: options.signal ?? controller.signal
        })
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            throw new Error('Сервер отвечает дольше обычного. Попробуйте ещё раз.')
        }

        throw error
    } finally {
        window.clearTimeout(timeoutId)
    }

    const json = await response.json().catch(() => null)

    if (!response.ok) {
        if (response.status === 413) {
            throw new Error(json?.error || 'Изображение слишком большое. Выберите файл меньше 5 МБ.')
        }

        throw new Error(json?.error || 'Request failed')
    }

    if (json === null) {
        throw new Error('API returned an empty response')
    }

    return json
}

export async function authFetch(path: string, options: RequestInit = {}) {
    const firstToken = await getAccessToken()

    try {
        return await requestJson(path, options, firstToken)
    } catch (error: any) {
        if (error?.message !== 'Unauthorized') throw error

        clearAccessToken()
        const refreshedToken = await refreshAccessToken()
        if (!refreshedToken) throw error

        return requestJson(path, options, refreshedToken)
    }
}

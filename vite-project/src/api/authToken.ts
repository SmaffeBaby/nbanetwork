let accessToken: string | null = null

export function setAccessToken(token: string | null | undefined) {
    accessToken = token || null
}

export function getAccessToken() {
    return accessToken
}

export function clearAccessToken() {
    accessToken = null
}

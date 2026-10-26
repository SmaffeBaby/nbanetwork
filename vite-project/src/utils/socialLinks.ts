export function normalizeSocialLink(value: string | null | undefined, network: 'telegram' | 'instagram'): string | null {
    const input = (value ?? '').trim()
    if (!input) return null
    const handle = network === 'telegram' ? /^[A-Za-z0-9_]{1,64}$/ : /^[A-Za-z0-9_.]{1,30}$/
    const base = network === 'telegram' ? 'https://t.me/' : 'https://www.instagram.com/'
    const name = input.replace(/^@/, '')
    if (handle.test(name)) return base + name + (network === 'instagram' ? '/' : '')
    try {
        const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
        const hosts = network === 'telegram' ? ['t.me', 'telegram.me', 'www.t.me'] : ['instagram.com', 'www.instagram.com']
        const path = url.pathname.replace(/^\//, '').replace(/\/$/, '')
        if (!['http:', 'https:'].includes(url.protocol) || !hosts.includes(url.hostname.toLowerCase()) || url.username || url.password || url.port || !handle.test(path)) throw new Error()
        return base + path + (network === 'instagram' ? '/' : '')
    } catch {
        throw new Error(network === 'telegram' ? 'Укажите имя пользователя Telegram или ссылку https://t.me/username.' : 'Укажите имя пользователя Instagram или ссылку https://www.instagram.com/username/.')
    }
}

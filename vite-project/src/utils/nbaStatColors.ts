export function fgClass(p: any) {
    const attempts = p.fgA ?? 0
    const pct = p.fgPct

    if (pct == null) return ''
    if (pct >= 50) return 'text-green-600 font-semibold'
    if (attempts < 5) return ''
    if (pct < 50) return 'text-red-600'

    return ''
}

export function tpClass(p: any) {
    const attempts = p.tpA ?? 0
    const pct = p.tpPct

    if (pct == null) return ''
    if (pct >= 40) return 'text-green-600 font-semibold'
    if (attempts < 5) return ''
    if (pct < 40) return 'text-red-600'

    return ''
}

export function ftClass(p: any) {
    const attempts = p.ftA ?? 0
    const pct = p.ftPct

    if (pct == null) return ''
    if (attempts === 0) return ''
    if (attempts === 2) return ''

    if (pct < 60) return 'text-red-600'
    if (pct < 70) return 'text-orange-500'
    return 'text-green-600 font-semibold'
}

export function statGold(v: number) {
    return v >= 10
        ? 'bg-yellow-100 text-yellow-700 font-semibold'
        : ''
}
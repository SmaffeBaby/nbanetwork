import { computed, defineComponent, h, ref, watch } from 'vue'

type Segment = {
    key: string
    label: string
    value: string
    percent: number
    color: string
}

type StatGroup = {
    key: string
    title: string
    segments: Segment[]
}

type PlayerDetails = {
    groups: StatGroup[]
}

type UsePlayerExcelStatsProps = {
    players: any[]
    recap: any
}

const DETAIL_CACHE_KEY = 'nba-dashboard:player-excel-details:v2'
const MAX_CACHE_ITEMS = 80
const detailCache = new Map<string, PlayerDetails>()

export const StatBar = defineComponent({
    props: {
        label: { type: String, required: true },
        value: { type: String, required: true },
        percent: { type: Number, required: true },
        color: { type: String, required: true }
    },
    setup(props) {
        return () => h('div', { class: 'grid gap-1' }, [
            h('div', { class: 'flex items-center justify-between gap-3 text-xs font-black uppercase text-gray-600' }, [
                h('span', props.label),
                h('strong', { class: 'text-gray-950' }, props.value)
            ]),
            h('div', { class: 'h-2.5 overflow-hidden rounded-full bg-gray-200' }, [
                h('span', {
                    class: 'block h-full rounded-full',
                    style: {
                        width: `${Math.max(props.percent, props.percent > 0 ? 4 : 0)}%`,
                        backgroundColor: props.color
                    }
                })
            ])
        ])
    }
})

export const usePlayerExcelStats = (props: UsePlayerExcelStatsProps) => {
    const selectedPlayerId = ref('')
    const isOpen = ref(false)
    const search = ref('')

    const n = (value: any) => Number(value ?? 0)
    const pct = (value: any) => `${n(value).toFixed(1)}%`
    const statValue = (value: any) => Number.isInteger(n(value)) ? String(n(value)) : n(value).toFixed(1)

    const playerKey = (player: any) =>
        String(player?.PLAYER_ID || player?.personId || player?.playerId || '')

    const loadPersistentCache = () => {
        if (typeof window === 'undefined' || detailCache.size) return

        try {
            const raw = window.localStorage.getItem(DETAIL_CACHE_KEY)
            const parsed = raw ? JSON.parse(raw) : {}

            Object.entries(parsed).forEach(([key, value]) => {
                detailCache.set(key, value as PlayerDetails)
            })
        } catch {
            detailCache.clear()
        }
    }

    const persistCache = () => {
        if (typeof window === 'undefined') return

        const entries = Array.from(detailCache.entries()).slice(-MAX_CACHE_ITEMS)
        detailCache.clear()
        entries.forEach(([key, value]) => detailCache.set(key, value))

        try {
            window.localStorage.setItem(DETAIL_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
        } catch {
            // Storage can be unavailable in private modes; in-memory cache is enough for the session.
        }
    }

    const detailCacheKey = (player: any) => [
        playerKey(player),
        statValue(player.minutes),
        statValue(player.points),
        statValue(player.fgM),
        statValue(player.fgA),
        statValue(player.ftA),
        statValue(player.rebounds),
        statValue(player.gameScore)
    ].join(':')

    const makeSegments = (items: Array<{ key: string; label: string; value: number; color: string }>): Segment[] => {
        const max = Math.max(...items.map((item) => item.value), 1)

        return items.map((item) => ({
            ...item,
            value: statValue(item.value),
            percent: item.value / max * 100
        }))
    }

    const makePercentSegments = (items: Array<{ key: string; label: string; value: number; color: string }>): Segment[] =>
        items.map((item) => ({
            ...item,
            value: pct(item.value),
            percent: Math.min(Math.max(item.value, 0), 100)
        }))

    const buildDetails = (player: any): PlayerDetails => ({
        groups: [
            {
                key: 'summary',
                title: 'Основное',
                segments: makeSegments([
                    { key: 'minutes', label: 'MIN', value: n(player.minutes), color: '#111827' },
                    { key: 'points', label: 'PTS', value: n(player.points), color: '#dc2626' },
                    { key: 'gameScore', label: 'GmSc', value: n(player.gameScore), color: '#7c3aed' }
                ])
            },
            {
                key: 'fieldGoals',
                title: 'Броски с игры',
                segments: makeSegments([
                    { key: 'fgM', label: 'FGM', value: n(player.fgM), color: '#111827' },
                    { key: 'fgA', label: 'FGA', value: n(player.fgA), color: '#64748b' },
                    { key: 'fgMiss', label: 'FG MISS', value: n(player.fgMiss), color: '#9ca3af' },
                    { key: 'twoM', label: '2PM', value: n(player.twoM), color: '#2563eb' },
                    { key: 'twoA', label: '2PA', value: n(player.twoA), color: '#60a5fa' },
                    { key: 'tpM', label: '3PM', value: n(player.tpM), color: '#16a34a' },
                    { key: 'tpA', label: '3PA', value: n(player.tpA), color: '#86efac' }
                ])
            },
            {
                key: 'freeThrows',
                title: 'Штрафные',
                segments: makeSegments([
                    { key: 'ftM', label: 'FTM', value: n(player.ftM), color: '#111827' },
                    { key: 'ftA', label: 'FTA', value: n(player.ftA), color: '#64748b' },
                    { key: 'ftMiss', label: 'FT MISS', value: n(player.ftMiss), color: '#9ca3af' }
                ])
            },
            {
                key: 'rebounds',
                title: 'Подборы',
                segments: makeSegments([
                    { key: 'offensiveRebounds', label: 'OREB', value: n(player.offensiveRebounds), color: '#16a34a' },
                    { key: 'defensiveRebounds', label: 'DREB', value: n(player.defensiveRebounds), color: '#f59e0b' },
                    { key: 'rebounds', label: 'TREB', value: n(player.rebounds), color: '#111827' }
                ])
            },
            {
                key: 'playmakingDefense',
                title: 'Розыгрыш и защита',
                segments: makeSegments([
                    { key: 'assists', label: 'AST', value: n(player.assists), color: '#2563eb' },
                    { key: 'steals', label: 'STL', value: n(player.steals), color: '#16a34a' },
                    { key: 'blocks', label: 'BLK', value: n(player.blocks), color: '#7c3aed' },
                    { key: 'turnovers', label: 'TOV', value: n(player.turnovers), color: '#dc2626' },
                    { key: 'fouls', label: 'PF', value: n(player.fouls), color: '#f59e0b' }
                ])
            },
            {
                key: 'efficiency',
                title: 'Эффективность',
                segments: makePercentSegments([
                    { key: 'fgPct', label: 'FG%', value: n(player.fgPct), color: '#111827' },
                    { key: 'twoPct', label: '2P%', value: n(player.twoPct), color: '#2563eb' },
                    { key: 'tpPct', label: '3P%', value: n(player.tpPct), color: '#16a34a' },
                    { key: 'ftPct', label: 'FT%', value: n(player.ftPct), color: '#f59e0b' },
                    { key: 'efgPct', label: 'EFG%', value: n(player.efgPct), color: '#7c3aed' },
                    { key: 'tsPct', label: 'TS%', value: n(player.tsPct), color: '#dc2626' }
                ])
            }
        ]
    })

    const getCachedDetails = (player: any) => {
        if (!player) return null

        loadPersistentCache()

        const key = detailCacheKey(player)
        const cached = detailCache.get(key)

        if (cached) return cached

        const details = buildDetails(player)
        detailCache.set(key, details)
        persistCache()

        return details
    }

    const selectedPlayer = computed(() =>
        props.players.find((player) => playerKey(player) === selectedPlayerId.value) || props.players[0] || null
    )

    const selectedDetails = computed(() => getCachedDetails(selectedPlayer.value))

    const normalizedSearch = computed(() => search.value.toLowerCase().trim())

    const filteredPlayers = computed(() => {
        const query = normalizedSearch.value
        if (!query) return props.players

        return props.players.filter((player) => {
            const haystack = [
                player.name,
                player.position,
                player.jerseyNum
            ].join(' ').toLowerCase()

            return haystack.includes(query)
        })
    })

    const playerIdsBySide = computed(() => {
        const collect = (players: any[] = []) => new Set(players.map(playerKey))

        return {
            away: collect(props.recap?.players?.away || []),
            home: collect(props.recap?.players?.home || [])
        }
    })

    const groupedPlayers = computed(() => {
        const awayAbbr = props.recap?.meta?.awayAbbr || 'Гости'
        const homeAbbr = props.recap?.meta?.homeAbbr || 'Дом'
        const awayIds = playerIdsBySide.value.away
        const homeIds = playerIdsBySide.value.home

        const awayPlayers = filteredPlayers.value.filter((player) => awayIds.has(playerKey(player)))
        const homePlayers = filteredPlayers.value.filter((player) => homeIds.has(playerKey(player)))
        const knownIds = new Set([...awayIds, ...homeIds])
        const otherPlayers = filteredPlayers.value.filter((player) => !knownIds.has(playerKey(player)))

        return [
            { key: 'away', label: `${awayAbbr} · гостевая команда`, players: awayPlayers },
            { key: 'home', label: `${homeAbbr} · домашняя команда`, players: homePlayers },
            { key: 'other', label: 'Остальные', players: otherPlayers }
        ].filter((group) => group.players.length)
    })

    const selectPlayer = (playerId: string | number) => {
        selectedPlayerId.value = String(playerId)
        search.value = ''
        isOpen.value = false
    }

    watch(
        () => props.players,
        (players) => {
            if (!players.length) {
                selectedPlayerId.value = ''
                return
            }

            if (!players.some((player) => playerKey(player) === selectedPlayerId.value)) {
                selectedPlayerId.value = playerKey(players[0])
            }
        },
        { immediate: true }
    )

    return {
        StatBar,
        selectedPlayerId,
        selectedPlayer,
        selectedDetails,
        isOpen,
        search,
        filteredPlayers,
        groupedPlayers,
        selectPlayer
    }
}
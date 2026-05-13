import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
    ChartBarSquareIcon,
    MapIcon,
    NewspaperIcon,
    TrophyIcon,
    UserCircleIcon,
    UserGroupIcon
} from '@heroicons/vue/24/outline'
import { supabase } from '../../lib/supabase'
import { teamsFullNames } from '../../constants/TeamFullName'
import { getPlayerImage, handleImageError } from '../../utils/playerImage'

type ResultType = 'team' | 'page' | 'player' | 'profile' | 'news'

type SearchResult = {
    id: string
    type: ResultType
    title: string
    subtitle: string
    to: string
    image?: string
    playerId?: number
    icon: Component
}

type PlayerRow = {
    PLAYER_ID?: number
    PLAYER_NAME?: string
    TEAM_ABBREVIATION?: string
}

type ProfileRow = {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_img: string | null
}

type NewsRow = {
    id: string
    title: string
    excerpt: string | null
    cover_image_url: string | null
    hashtags: string[] | null
}

const teamIcon = markRaw(UserGroupIcon)
const playerIcon = markRaw(UserCircleIcon)
const profileIcon = markRaw(UserCircleIcon)
const newsIcon = markRaw(NewspaperIcon)

const typeLabels: Record<ResultType, string> = {
    team: 'Команда',
    page: 'Раздел',
    player: 'Игрок',
    profile: 'Профиль',
    news: 'Новость'
}

const cyrillicToLatin: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
}

const playerQueryAliases: Record<string, string> = {
    'tyrise hailybirton': 'tyrese haliburton',
    'tyrese hailybirton': 'tyrese haliburton',
    'tyris haliburton': 'tyrese haliburton',
    'micael jordan': 'michael jordan',
    'mikel jordan': 'michael jordan',
    'kobe brayant': 'kobe bryant',
    'kobi bryant': 'kobe bryant',
    'shakil o nil': 'shaquille o neal',
    'shakil onil': 'shaquille o neal',
    'shaquil oneal': 'shaquille o neal',
    shaq: 'shaquille o neal'
}

const fallbackAllTimePlayers = [
    { PLAYER_ID: 1630169, PLAYER_NAME: 'Tyrese Haliburton', TEAM_ABBREVIATION: 'NBA', IS_ACTIVE: true },
    { PLAYER_ID: 893, PLAYER_NAME: 'Michael Jordan', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 977, PLAYER_NAME: 'Kobe Bryant', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 406, PLAYER_NAME: "Shaquille O'Neal", TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 2544, PLAYER_NAME: 'LeBron James', TEAM_ABBREVIATION: 'NBA', IS_ACTIVE: true },
    { PLAYER_ID: 201939, PLAYER_NAME: 'Stephen Curry', TEAM_ABBREVIATION: 'NBA', IS_ACTIVE: true },
    { PLAYER_ID: 201142, PLAYER_NAME: 'Kevin Durant', TEAM_ABBREVIATION: 'NBA', IS_ACTIVE: true },
    { PLAYER_ID: 1449, PLAYER_NAME: 'Larry Bird', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 77142, PLAYER_NAME: 'Magic Johnson', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 1495, PLAYER_NAME: 'Tim Duncan', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 947, PLAYER_NAME: 'Allen Iverson', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false },
    { PLAYER_ID: 2548, PLAYER_NAME: 'Dwyane Wade', TEAM_ABBREVIATION: 'LEGEND', IS_ACTIVE: false }
]

const pageResults: SearchResult[] = [
    {
        id: 'page-standings',
        type: 'page',
        title: 'Турнирная таблица',
        subtitle: 'Позиции команд по конференциям',
        to: '/standings',
        icon: markRaw(ChartBarSquareIcon)
    },
    {
        id: 'page-teams',
        type: 'page',
        title: 'Все команды',
        subtitle: 'Карточки клубов и переходы в профили команд',
        to: '/teams',
        icon: teamIcon
    },
    {
        id: 'page-player-stats',
        type: 'page',
        title: 'Статистика игроков',
        subtitle: 'Лидеры сезона, фильтры и расширенные метрики',
        to: '/player-stats',
        icon: playerIcon
    },
    {
        id: 'page-playoffs',
        type: 'page',
        title: 'Плей-офф',
        subtitle: 'Сетка, серии и матчи на выбывание',
        to: '/playoffs',
        icon: markRaw(TrophyIcon)
    },
    {
        id: 'page-news',
        type: 'page',
        title: 'Новости',
        subtitle: 'Статьи, хештеги и материалы к матчам',
        to: '/news',
        icon: newsIcon
    },
    {
        id: 'page-profile',
        type: 'page',
        title: 'Мой профиль',
        subtitle: 'Избранные команды, игроки и просмотренные матчи',
        to: '/profile',
        icon: profileIcon
    }
]

const quickLinks: SearchResult[] = [
    pageResults[1],
    pageResults[2],
    pageResults[0],
    {
        id: 'page-map',
        type: 'page',
        title: 'Карта NBA',
        subtitle: 'Команды на интерактивной карте',
        to: '/#map',
        icon: markRaw(MapIcon)
    }
]

const teamResults: SearchResult[] = Object.entries(teamsFullNames).map(([abbr, name]) => ({
    id: `team-${abbr}`,
    type: 'team' as const,
    title: name,
    subtitle: `${abbr} • профиль команды`,
    to: `/team/${abbr}`,
    image: `/logos/${abbr}.svg`,
    icon: teamIcon
}))

export function useHomeSearch() {
    const router = useRouter()
    const searchRoot = ref<HTMLElement | null>(null)
    const search = ref('')
    const isOpen = ref(false)
    const activeIndex = ref(0)
    const players = ref<SearchResult[]>([])
    const allTimePlayers = ref<SearchResult[]>([])
    const profiles = ref<SearchResult[]>([])
    const news = ref<SearchResult[]>([])
    const playersLoading = ref(false)
    const allTimePlayersLoading = ref(false)
    const profilesLoading = ref(false)
    const newsLoading = ref(false)
    const playersLoaded = ref(false)
    let profileSearchTimer: ReturnType<typeof setTimeout> | null = null

    const normalizedSearch = computed(() => search.value.trim().toLowerCase())

    const normalizePlayerQuery = (value: string) => {
        const normalized = value
            .toLowerCase()
            .split('')
            .map(char => cyrillicToLatin[char] ?? char)
            .join('')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        return playerQueryAliases[normalized] ?? normalized
    }

    const playerNameMatches = (query: string, name: string) => {
        const normalizedName = normalizePlayerQuery(name)
        const queryTokens = query.split(' ')
        const nameTokens = normalizedName.split(' ')

        return normalizedName.includes(query) || queryTokens.every(queryToken =>
            nameTokens.some(nameToken => nameToken.startsWith(queryToken))
        )
    }

    const mapPlayerResult = (player: PlayerRow & { IS_ACTIVE?: boolean }): SearchResult => ({
        id: `player-${player.PLAYER_ID ?? player.PLAYER_NAME}`,
        type: 'player',
        title: String(player.PLAYER_NAME),
        subtitle: player.IS_ACTIVE ? 'NBA • карточка игрока' : 'легенда NBA • карточка игрока',
        to: `/player/${encodeURIComponent(String(player.PLAYER_NAME))}`,
        image: getPlayerImage(player),
        playerId: player.PLAYER_ID,
        icon: playerIcon
    })

    const uniqueResults = (items: SearchResult[]) => {
        const seen = new Set<string>()

        return items.filter(item => {
            const key = item.type === 'player'
                ? `player-${item.title.toLowerCase()}`
                : `${item.type}-${item.id}`

            if (seen.has(key)) {
                return false
            }

            seen.add(key)
            return true
        })
    }

    const visibleResults = computed(() => {
        const query = normalizedSearch.value
        if (!query) return []

        const localResults = [...teamResults, ...pageResults].filter(item =>
            `${item.title} ${item.subtitle}`.toLowerCase().includes(query)
        )
        const playerResults = players.value.filter(item =>
            `${item.title} ${item.subtitle}`.toLowerCase().includes(query)
        )

        return uniqueResults([
            ...localResults,
            ...playerResults,
            ...allTimePlayers.value,
            ...profiles.value,
            ...news.value
        ]).slice(0, 10)
    })

    const isLoadingAny = computed(() =>
        playersLoading.value || allTimePlayersLoading.value || profilesLoading.value || newsLoading.value
    )

    const currentSeason = () => {
        const now = new Date()
        const year = now.getFullYear()
        const start = now.getMonth() >= 9 ? year : year - 1
        return `${start}-${String(start + 1).slice(-2)}`
    }

    const mapPlayers = (rows: unknown[], headers: string[]) => {
        const playerIdIndex = headers.indexOf('PLAYER_ID')
        const playerNameIndex = headers.indexOf('PLAYER_NAME')
        const teamIndex = headers.indexOf('TEAM_ABBREVIATION')

        return rows
            .map(row => {
                const values = Array.isArray(row) ? row : []
                return {
                    PLAYER_ID: values[playerIdIndex],
                    PLAYER_NAME: values[playerNameIndex],
                    TEAM_ABBREVIATION: values[teamIndex]
                } as PlayerRow
            })
            .filter(player => player.PLAYER_NAME)
    }

    const fetchPlayers = async () => {
        if (playersLoaded.value || playersLoading.value) return

        playersLoading.value = true

        try {
            const response = await axios.get(`/api/player-stats/${currentSeason()}`)
            const resultSet = response.data?.resultSets?.[0]
            const rows = mapPlayers(resultSet?.rowSet ?? [], resultSet?.headers ?? [])

            players.value = rows.map(player => ({
                id: `player-${player.PLAYER_ID ?? player.PLAYER_NAME}`,
                type: 'player',
                title: String(player.PLAYER_NAME),
                subtitle: `${player.TEAM_ABBREVIATION || 'NBA'} • карточка игрока`,
                to: `/player/${encodeURIComponent(String(player.PLAYER_NAME))}`,
                image: getPlayerImage(player),
                playerId: player.PLAYER_ID,
                icon: playerIcon
            }))
            playersLoaded.value = true
        } catch {
            players.value = []
        } finally {
            playersLoading.value = false
        }
    }

    const fetchAllTimePlayers = async (query: string) => {
        if (query.length < 2) {
            allTimePlayers.value = []
            return
        }

        allTimePlayersLoading.value = true
        const normalizedQuery = normalizePlayerQuery(query)
        const fallbackResults = fallbackAllTimePlayers
            .filter(player => playerNameMatches(normalizedQuery, player.PLAYER_NAME))
            .map(mapPlayerResult)

        try {
            const response = await axios.get('/api/players/search', {
                params: { q: query }
            })

            allTimePlayers.value = uniqueResults([
                ...(response.data?.data ?? []).map(mapPlayerResult),
                ...fallbackResults
            ])
        } catch {
            allTimePlayers.value = fallbackResults
        } finally {
            allTimePlayersLoading.value = false
        }
    }

    const fetchProfiles = async (query: string) => {
        if (query.length < 2) {
            profiles.value = []
            return
        }

        profilesLoading.value = true

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_img')
                .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
                .limit(5)

            if (error) {
                profiles.value = []
                return
            }

            profiles.value = ((data ?? []) as ProfileRow[])
                .map(profile => {
                    const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
                    return {
                        id: `profile-${profile.id}`,
                        type: 'profile' as const,
                        title: fullName || 'Пользователь NBA Dashboard',
                        subtitle: 'публичный профиль',
                        to: `/profile/${profile.id}`,
                        image: profile.avatar_img ?? undefined,
                        icon: profileIcon
                    }
                })
        } catch {
            profiles.value = []
        } finally {
            profilesLoading.value = false
        }
    }

    const fetchNews = async (query: string) => {
        if (query.length < 2) {
            news.value = []
            return
        }

        newsLoading.value = true
        const normalizedTag = query.trim().replace(/^#/, '').toLowerCase()

        try {
            const escaped = query.replace(/[%_,]/g, '')
            let request = supabase
                .from('news_articles')
                .select('id, title, excerpt, cover_image_url, hashtags')
                .limit(5)

            request = query.startsWith('#')
                ? request.contains('hashtags', [normalizedTag])
                : request.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`)

            const { data, error } = await request

            if (error) {
                news.value = []
                return
            }

            news.value = ((data ?? []) as NewsRow[]).map(item => ({
                    id: `news-${item.id}`,
                    type: 'news' as const,
                    title: item.title,
                    subtitle: item.excerpt || 'новость NBA Dashboard',
                    to: query.startsWith('#')
                        ? `/news?tag=${encodeURIComponent(normalizedTag)}`
                        : `/news?q=${encodeURIComponent(item.title)}`,
                    image: item.cover_image_url ?? undefined,
                    icon: newsIcon
                }))
        } catch {
            news.value = []
        } finally {
            newsLoading.value = false
        }
    }

    const typeBadgeClass = (type: ResultType) => {
        const classes: Record<ResultType, string> = {
            team: 'bg-red-50 text-red-700',
            page: 'bg-blue-50 text-blue-700',
            player: 'bg-emerald-50 text-emerald-700',
            profile: 'bg-violet-50 text-violet-700',
            news: 'bg-amber-50 text-amber-700'
        }

        return classes[type]
    }

    const handleResultImageError = (event: Event) => {
        const target = event.target as HTMLImageElement

        if (target.dataset.playerId) {
            handleImageError(event)
            return
        }

        target.style.display = 'none'
    }

    const openResult = async (item: SearchResult) => {
        isOpen.value = false
        search.value = item.title

        if (item.to.includes('#')) {
            const [path, hash] = item.to.split('#')
            await router.push(path || '/')
            document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            return
        }

        await router.push(item.to)
    }

    const submitSearch = () => {
        const item = visibleResults.value[activeIndex.value] ?? visibleResults.value[0]
        if (item) {
            void openResult(item)
            return
        }

        if (search.value.trim()) {
            void router.push({ path: '/player-stats', query: { search: search.value.trim() } })
            isOpen.value = false
        }
    }

    const moveActive = (step: number) => {
        if (!visibleResults.value.length) return

        isOpen.value = true
        const nextIndex = activeIndex.value + step
        activeIndex.value = (nextIndex + visibleResults.value.length) % visibleResults.value.length
    }

    const handleClickOutside = (event: MouseEvent) => {
        if (!searchRoot.value?.contains(event.target as Node)) {
            isOpen.value = false
        }
    }

    watch(search, value => {
        activeIndex.value = 0
        isOpen.value = true

        if (value.trim().length >= 2) {
            void fetchPlayers()
        }

        if (profileSearchTimer) {
            clearTimeout(profileSearchTimer)
        }

        profileSearchTimer = setTimeout(() => {
            void fetchAllTimePlayers(value.trim())
            void fetchProfiles(value.trim())
            void fetchNews(value.trim())
        }, 250)
    })

    watch(visibleResults, results => {
        if (activeIndex.value >= results.length) {
            activeIndex.value = 0
        }
    })

    onMounted(() => {
        document.addEventListener('click', handleClickOutside)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', handleClickOutside)

        if (profileSearchTimer) {
            clearTimeout(profileSearchTimer)
        }
    })

    return {
        searchRoot,
        search,
        isOpen,
        activeIndex,
        quickLinks,
        visibleResults,
        isLoadingAny,
        typeLabels,
        typeBadgeClass,
        handleResultImageError,
        openResult,
        submitSearch,
        moveActive
    }
}

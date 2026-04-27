import { ref, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import axios from 'axios'
import Chart from 'chart.js/auto'

export function useTeamsPointsTrendTable(
    teamId: number,
    season: Ref<string>
) {
    const chartRef = ref<HTMLCanvasElement | null>(null)
    const games = ref<any[]>([])
    let chart: Chart | null = null


    const load = async () => {

        const res = await axios.get(
            `/api/team-games/${teamId}/${season.value}`
        )

        const resultSet =
            res.data?.resultSets?.[0] ||
            res.data?.resultSet?.[0] ||
            res.data

        if (!resultSet?.headers || !resultSet?.rowSet) {
            return
        }

        const headers = resultSet.headers

        games.value = resultSet.rowSet.map((row: any[]) => {
            const obj: any = {}
            headers.forEach((h: string, i: number) => {
                obj[h] = row[i]
            })
            return obj
        })
    }

    const parseDate = (str: string) => new Date(str)

    const isHome = (matchup: string) => !matchup.includes('@')

    const render = () => {

        if (!chartRef.value) {
            return
        }

        if (!games.value.length) {
            return
        }

        const ctx = chartRef.value.getContext('2d')
        if (!ctx) {
            return
        }

        if (chart) {
            chart.destroy()
            chart = null
        }

        const sorted = [...games.value].sort(
            (a, b) =>
                parseDate(a.GAME_DATE).getTime() -
                parseDate(b.GAME_DATE).getTime()
        )

        const labels = sorted.map(g => {
            const d = parseDate(g.GAME_DATE)
            return `${String(d.getDate()).padStart(2, '0')}.${String(
                d.getMonth() + 1
            ).padStart(2, '0')}`
        })

        const overall = sorted.map(g => Number(g.PTS))

        const home = sorted.map(g =>
            isHome(g.MATCHUP) ? Number(g.PTS) : null
        )

        const away = sorted.map(g =>
            !isHome(g.MATCHUP) ? Number(g.PTS) : null
        )

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Общее',
                        data: overall,
                        borderColor: '#6366f1',
                        tension: 0.3,
                        pointRadius: 3
                    },
                    {
                        label: 'Дома',
                        data: home,
                        borderColor: '#22c55e',
                        tension: 0.3,
                        spanGaps: true,
                        pointRadius: 3
                    },
                    {
                        label: 'На выезде',
                        data: away,
                        borderColor: '#f97316',
                        tension: 0.3,
                        spanGaps: true,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        })

    }

    const fetchGames = async () => {
        await load()
        await nextTick()
        render()
    }

    watch(
        season,
        () => {
            fetchGames()
        },
        { immediate: true }
    )

    return {
        chartRef,
        games,
        fetchGames
    }
}
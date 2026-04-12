import { ref } from 'vue'
import axios from 'axios'
import Chart from 'chart.js/auto'

export function useTeamsPointsTrendTable(teamId: number, season: string) {
    const chartRef = ref<HTMLCanvasElement | null>(null)
    const games = ref<any[]>([])
    let chart: Chart | null = null

    const load = async () => {
        const res = await axios.get(
            `/api/team-games/${teamId}/${season}`
        )

        const resultSet = res.data.resultSets?.[0]
        if (!resultSet) return

        const headers = resultSet.headers

        games.value = resultSet.rowSet.map((row: any[]) => {
            const obj: any = {}
            headers.forEach((h: string, i: number) => {
                obj[h] = row[i]
            })
            return obj
        })
    }

    const isHome = (matchup: string) => !matchup.includes('@')

    const render = () => {
        if (!chartRef.value || !games.value.length) return

        if (chart) {
            chart.destroy()
            chart = null
        }

        const ctx = chartRef.value.getContext('2d')
        if (!ctx) return

        const sorted = games.value.slice().reverse()

        const labels = sorted.map(g => {
            const d = new Date(g.GAME_DATE)
            return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`
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
                        backgroundColor: '#6366f1',
                        tension: 0.3,
                        pointRadius: 3
                    },
                    {
                        label: 'Дома',
                        data: home,
                        borderColor: '#22c55e',
                        backgroundColor: '#22c55e',
                        spanGaps: true,
                        tension: 0.3,
                        pointRadius: 3
                    },
                    {
                        label: 'На выезде',
                        data: away,
                        borderColor: '#f97316',
                        backgroundColor: '#f97316',
                        spanGaps: true,
                        tension: 0.3,
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
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx: any) => {
                                const g = sorted[ctx.dataIndex]
                                return g ? `vs ${g.MATCHUP}` : ''
                            }
                        }
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

    const init = async () => {
        await load()
        render()
    }

    return {
        chartRef,
        games,
        init
    }
}
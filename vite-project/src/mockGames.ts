export interface Game {
    id: number
    home: string
    away: string
    score: string
    quarter: string
}

export const games: Game[] = [
    { id: 1, home: 'LAL', away: 'GSW', score: '102-98', quarter: 'Q4' },
    { id: 2, home: 'BKN', away: 'MIA', score: '99-101', quarter: 'Q4' },
    { id: 3, home: 'CHI', away: 'NYK', score: '110-105', quarter: 'Q4' },
]
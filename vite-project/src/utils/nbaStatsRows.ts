export async function fetchNbaStatsRows<T>(url: string, signal: AbortSignal): Promise<T[]> {
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) })
    if (!response.ok) throw new Error('Не удалось загрузить статистику выбранного сезона')
    const data = await response.json()
    const result = data?.resultSet ?? data?.resultSets?.[0]
    if (!Array.isArray(result?.headers) || !Array.isArray(result?.rowSet)) {
        throw new Error('Источник не вернул статистику выбранного сезона')
    }
    return result.rowSet.map((row: unknown[]) => Object.fromEntries(result.headers.map((key: string, index: number) => [key, row[index]])))
}

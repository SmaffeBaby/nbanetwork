import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export interface TeamMapItem {
    id: string
    logo: string
    x: number
    y: number
    link: string
}

const MAP_FIELDS = 'id, logo, x, y, link'
const requestSignal = (signal?: AbortSignal) => signal
    ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
    : AbortSignal.timeout(10000)

// TanStack Query owns the data cache. This store only performs database requests.
export const useMapStore = defineStore('map', () => {
    const fetchTeams = async (signal?: AbortSignal): Promise<TeamMapItem[]> => {
        const { data, error } = await supabase
            .from('map_points')
            .select(MAP_FIELDS)
            .order('id')
            .abortSignal(requestSignal(signal))
        if (error) throw new Error('Не удалось загрузить точки карты. Попробуйте ещё раз.')
        if (!Array.isArray(data)) throw new Error('Сервер вернул некорректный список точек карты.')
        return data
    }

    const addTeam = async (team: Omit<TeamMapItem, 'id'>): Promise<TeamMapItem> => {
        const { data, error } = await supabase
            .from('map_points')
            .insert([team])
            .select(MAP_FIELDS)
            .abortSignal(requestSignal())
            .single()
        if (error || !data) throw new Error('Не удалось добавить точку карты.')
        return data
    }

    const updateTeam = async (id: string, updates: Partial<Omit<TeamMapItem, 'id'>>): Promise<TeamMapItem> => {
        const { data, error } = await supabase
            .from('map_points')
            .update(updates)
            .eq('id', id)
            .select(MAP_FIELDS)
            .abortSignal(requestSignal())
            .single()
        if (error || !data) throw new Error('Не удалось сохранить точку карты.')
        return data
    }

    const deleteTeam = async (id: string): Promise<void> => {
        const { data, error } = await supabase
            .from('map_points')
            .delete()
            .eq('id', id)
            .select('id')
            .abortSignal(requestSignal())
            .single()
        if (error || !data) throw new Error('Не удалось удалить точку карты.')
    }

    return { fetchTeams, addTeam, updateTeam, deleteTeam }
})

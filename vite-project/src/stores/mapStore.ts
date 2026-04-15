import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export interface TeamMapItem {
    id: string
    logo: string
    x: number
    y: number
    link: string
}

export const useMapStore = defineStore('map', () => {

    const teams = ref<TeamMapItem[]>([])
    const isAdmin = ref(false)
    const loaded = ref(false)
    const adminChecked = ref(false)

    const fetchTeams = async () => {
        if (loaded.value) return

        const { data } = await supabase
            .from('map_points')
            .select('*')

        if (data) {
            teams.value = data
            loaded.value = true
        }
    }

    const checkAdmin = async () => {
        adminChecked.value = false
        isAdmin.value = false

        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data } = await supabase
            .from('profiles')
            .select('admin')
            .eq('id', userData.user.id)
            .single()

        isAdmin.value = !!data?.admin
        adminChecked.value = true
    }

    const addTeam = async (team: Omit<TeamMapItem, 'id'>) => {
        const { data } = await supabase
            .from('map_points')
            .insert([team])
            .select()

        if (data?.length) {
            teams.value.push(data[0])
        }
    }

    const updateTeam = async (id: string, updates: Partial<TeamMapItem>) => {
        await supabase
            .from('map_points')
            .update(updates)
            .eq('id', id)

        const i = teams.value.findIndex(t => t.id === id)
        if (i !== -1) {
            teams.value[i] = { ...teams.value[i], ...updates }
        }
    }

    const deleteTeam = async (id: string) => {
        await supabase
            .from('map_points')
            .delete()
            .eq('id', id)

        teams.value = teams.value.filter(t => t.id !== id)
    }

    return {
        teams,
        isAdmin,
        loaded,
        adminChecked,

        fetchTeams,
        checkAdmin,
        addTeam,
        updateTeam,
        deleteTeam
    }
})
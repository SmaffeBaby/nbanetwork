import { ref } from 'vue'
import { supabase } from '../../../lib/supabase'

export type ProfileProgressCategory = 'watched_games' | 'top_team'

export type ProfileProgressRule = {
    id: string
    category: ProfileProgressCategory
    max_games: number
    title: string
    description: string
    svg: string | null
}

export type ProfileProgressRulePayload = {
    id?: string
    category: ProfileProgressCategory
    max_games: number
    title: string
    description: string
    svg: string | null
}

export const useProfileProgressRules = () => {
    const rules = ref<ProfileProgressRule[]>([])
    const loading = ref(false)
    const saving = ref(false)
    const error = ref<string | null>(null)

    const fetchRules = async () => {
        loading.value = true
        error.value = null

        const { data, error: fetchError } = await supabase
            .from('profile_progress_rules')
            .select('id, category, max_games, title, description, svg')
            .order('category', { ascending: true })
            .order('max_games', { ascending: true })

        loading.value = false

        if (fetchError) {
            error.value = fetchError.message
            rules.value = []
            return
        }

        rules.value = (data ?? []) as ProfileProgressRule[]
    }

    const saveRule = async (payload: ProfileProgressRulePayload) => {
        saving.value = true
        error.value = null

        const normalizedPayload = {
            category: payload.category,
            max_games: Number(payload.max_games),
            title: payload.title.trim(),
            description: payload.description.trim(),
            svg: payload.svg?.trim() || null
        }

        const query = payload.id
            ? supabase
                .from('profile_progress_rules')
                .update(normalizedPayload)
                .eq('id', payload.id)
            : supabase
                .from('profile_progress_rules')
                .insert(normalizedPayload)

        const { error: saveError } = await query
        saving.value = false

        if (saveError) {
            error.value = saveError.message
            return false
        }

        await fetchRules()
        return true
    }

    const deleteRule = async (id: string) => {
        saving.value = true
        error.value = null

        const { error: deleteError } = await supabase
            .from('profile_progress_rules')
            .delete()
            .eq('id', id)

        saving.value = false

        if (deleteError) {
            error.value = deleteError.message
            return false
        }

        rules.value = rules.value.filter(rule => rule.id !== id)
        return true
    }

    return {
        rules,
        loading,
        saving,
        error,
        fetchRules,
        saveRule,
        deleteRule
    }
}

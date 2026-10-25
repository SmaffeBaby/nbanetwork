import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useMapStore, type TeamMapItem } from '../../../stores/mapStore'
import { useAuthStore } from '../../../stores/auth'

export const MAP_QUERY_KEY = ['conference-map', 'points'] as const

export const useMap = () => {
    const store = useMapStore()
    const auth = useAuthStore()
    const client = useQueryClient()
    const mutationError = ref('')
    const query = useQuery({
        queryKey: MAP_QUERY_KEY,
        queryFn: ({ signal }) => store.fetchTeams(signal),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2
    })
    const teams = computed(() => query.data.value ?? [])
    const isAdmin = computed(() => auth.user?.isAdmin === true)

    const beforeWrite = async () => {
        mutationError.value = ''
        if (!isAdmin.value) throw new Error('Редактировать карту может только администратор.')
        await client.cancelQueries({ queryKey: MAP_QUERY_KEY })
    }
    const afterWrite = () => {
        // Keep the confirmed change visible while checking the full list in the background.
        void client.invalidateQueries({ queryKey: MAP_QUERY_KEY })
    }
    const onError = (error: Error) => { mutationError.value = error.message }
    const scope = { id: 'conference-map-writes' }
    const create = useMutation({
        scope,
        mutationFn: (team: Omit<TeamMapItem, 'id'>) => store.addTeam(team),
        onMutate: beforeWrite,
        onSuccess: (point) => {
            client.setQueryData<TeamMapItem[]>(MAP_QUERY_KEY, previous =>
                [...(previous ?? []).filter(item => item.id !== point.id), point])
            afterWrite()
        },
        onError
    })
    const update = useMutation({
        scope,
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<TeamMapItem, 'id'>> }) => store.updateTeam(id, updates),
        onMutate: beforeWrite,
        onSuccess: (point) => {
            client.setQueryData<TeamMapItem[]>(MAP_QUERY_KEY, previous =>
                [...(previous ?? []).filter(item => item.id !== point.id), point])
            afterWrite()
        },
        onError
    })
    const remove = useMutation({
        scope,
        mutationFn: (id: string) => store.deleteTeam(id),
        onMutate: beforeWrite,
        onSuccess: (_data, id) => {
            client.setQueryData<TeamMapItem[]>(MAP_QUERY_KEY, previous =>
                (previous ?? []).filter(item => item.id !== id))
            afterWrite()
        },
        onError
    })

    return {
        teams,
        isAdmin,
        loading: computed(() => query.isPending.value),
        loadError: computed(() => query.error.value?.message ?? ''),
        mutationError,
        saving: computed(() => create.isPending.value || update.isPending.value || remove.isPending.value),
        retry: () => query.refetch(),
        addTeam: (team: Omit<TeamMapItem, 'id'>) => create.mutateAsync(team),
        updateTeam: (id: string, updates: Partial<Omit<TeamMapItem, 'id'>>) => update.mutateAsync({ id, updates }),
        deleteTeam: (id: string) => remove.mutateAsync(id)
    }
}

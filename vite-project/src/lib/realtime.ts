export const isRealtimeEnabled = () => {
    return import.meta.env.VITE_SUPABASE_REALTIME === 'true'
}

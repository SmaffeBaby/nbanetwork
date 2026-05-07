import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/auth'

export type GameComment = {
    id: string
    game_id: string
    user_id: string
    message: string
    image_data: string | null
    created_at: string
    profiles?: {
        first_name: string
        last_name: string
        avatar_img: string | null
    } | null
}

const MAX_IMAGE_SIZE = 1024 * 1024

type RawGameComment = Omit<GameComment, 'profiles'> & {
    profiles?: GameComment['profiles'] | GameComment['profiles'][]
}

function normalizeComment(comment: RawGameComment): GameComment {
    return {
        ...comment,
        profiles: Array.isArray(comment.profiles)
            ? comment.profiles[0] ?? null
            : comment.profiles ?? null
    }
}

function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

export function useGameComments(gameId: Ref<string>) {
    const auth = useAuthStore()
    const comments = ref<GameComment[]>([])
    const message = ref('')
    const imageData = ref<string | null>(null)
    const imageName = ref('')
    const loading = ref(false)
    const sending = ref(false)
    const unreadCount = ref(0)
    const error = ref<string | null>(null)

    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollTimer: ReturnType<typeof window.setInterval> | null = null

    const canSend = computed(() =>
        Boolean(auth.user && (message.value.trim() || imageData.value))
    )

    const ensureAuthReady = async () => {
        if (!auth.user) {
            await auth.init()
            auth.subscribeAuthState()
        }
    }

    const sortedComments = computed(() =>
        [...comments.value].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    )

    const fetchComments = async () => {
        await ensureAuthReady()

        if (!auth.user || !gameId.value) return

        loading.value = true
        error.value = null

        const { data, error: fetchError } = await supabase
            .from('game_comments')
            .select(`
                id,
                game_id,
                user_id,
                message,
                image_data,
                created_at,
                profiles:user_id (
                    first_name,
                    last_name,
                    avatar_img
                )
            `)
            .eq('game_id', gameId.value)
            .order('created_at', { ascending: true })

        loading.value = false

        if (fetchError) {
            error.value = fetchError.message || 'Не удалось загрузить комментарии'
            return
        }

        comments.value = ((data ?? []) as unknown as RawGameComment[]).map(normalizeComment)
    }

    const fetchUnreadCount = async () => {
        await ensureAuthReady()

        if (!auth.user || !gameId.value) {
            unreadCount.value = 0
            return
        }

        const { data: readData } = await supabase
            .from('game_comment_reads')
            .select('read_at')
            .eq('game_id', gameId.value)
            .eq('user_id', auth.user.id)
            .maybeSingle()

        let query = supabase
            .from('game_comments')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId.value)
            .neq('user_id', auth.user.id)

        if (readData?.read_at) {
            query = query.gt('created_at', readData.read_at)
        }

        const { count } = await query
        unreadCount.value = count ?? 0
    }

    const markAsRead = async () => {
        await ensureAuthReady()

        if (!auth.user || !gameId.value) return

        const { error: readError } = await supabase
            .from('game_comment_reads')
            .upsert({
                game_id: gameId.value,
                user_id: auth.user.id,
                read_at: new Date().toISOString()
            }, { onConflict: 'game_id,user_id' })

        if (readError) return

        unreadCount.value = 0
    }

    const attachImage = async (event: Event) => {
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            error.value = 'Можно прикрепить только изображение'
            input.value = ''
            return
        }

        if (file.size > MAX_IMAGE_SIZE) {
            error.value = 'Изображение должно быть меньше 1 МБ'
            input.value = ''
            return
        }

        imageData.value = await fileToDataUrl(file)
        imageName.value = file.name
        input.value = ''
    }

    const removeImage = () => {
        imageData.value = null
        imageName.value = ''
    }

    const sendComment = async () => {
        await ensureAuthReady()

        if (!auth.user || !canSend.value) return

        sending.value = true
        error.value = null

        const text = message.value.trim()
        const image = imageData.value

        const { data, error: sendError } = await supabase
            .from('game_comments')
            .insert({
                game_id: gameId.value,
                user_id: auth.user.id,
                message: text,
                image_data: image
            })
            .select(`
                id,
                game_id,
                user_id,
                message,
                image_data,
                created_at
            `)
            .single()

        sending.value = false

        if (sendError) {
            error.value = sendError.message || 'Не удалось отправить комментарий'
            return
        }

        if (data) {
            const inserted = normalizeComment({
                ...(data as Omit<GameComment, 'profiles'>),
                profiles: {
                    first_name: auth.user.firstName,
                    last_name: auth.user.lastName,
                    avatar_img: auth.user.avatarImg
                }
            })
            comments.value = [
                ...comments.value.filter(comment => comment.id !== inserted.id),
                inserted
            ]
        }

        message.value = ''
        removeImage()
        await markAsRead()
        void fetchComments()
    }

    const subscribe = () => {
        if (channel || !gameId.value) return

        channel = supabase
            .channel(`game-comments-${gameId.value}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_comments',
                    filter: `game_id=eq.${gameId.value}`
                },
                async (payload) => {
                    const incoming = payload.new as GameComment

                    if (!comments.value.some(comment => comment.id === incoming.id)) {
                        await fetchComments()
                        await nextTick()
                    }

                    if (incoming.user_id !== auth.user?.id) {
                        await fetchUnreadCount()
                    }
                }
            )
            .subscribe()
    }

    const unsubscribe = async () => {
        if (!channel) return

        await supabase.removeChannel(channel)
        channel = null
    }

    onMounted(async () => {
        await ensureAuthReady()
        await fetchComments()
        await fetchUnreadCount()
        subscribe()

        pollTimer = window.setInterval(() => {
            void fetchComments()
            void fetchUnreadCount()
        }, 5000)
    })

    onUnmounted(() => {
        void unsubscribe()
        if (pollTimer) window.clearInterval(pollTimer)
    })

    watch(
        () => auth.user?.id,
        async () => {
            await fetchComments()
            await fetchUnreadCount()
            subscribe()
        }
    )

    return {
        user: computed(() => auth.user),
        comments: sortedComments,
        message,
        imageData,
        imageName,
        loading,
        sending,
        unreadCount,
        error,
        canSend,
        attachImage,
        removeImage,
        sendComment,
        markAsRead,
        fetchComments,
        fetchUnreadCount
    }
}

export function useGameCommentsUnread(gameId: Ref<string>) {
    const auth = useAuthStore()
    const unreadCount = ref(0)

    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollTimer: ReturnType<typeof window.setInterval> | null = null

    const ensureAuthReady = async () => {
        if (!auth.user) {
            await auth.init()
            auth.subscribeAuthState()
        }
    }

    const fetchUnreadCount = async () => {
        await ensureAuthReady()

        if (!auth.user || !gameId.value) {
            unreadCount.value = 0
            return
        }

        const { data: readData } = await supabase
            .from('game_comment_reads')
            .select('read_at')
            .eq('game_id', gameId.value)
            .eq('user_id', auth.user.id)
            .maybeSingle()

        let query = supabase
            .from('game_comments')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId.value)
            .neq('user_id', auth.user.id)

        if (readData?.read_at) {
            query = query.gt('created_at', readData.read_at)
        }

        const { count } = await query
        unreadCount.value = count ?? 0
    }

    const subscribe = () => {
        if (channel || !gameId.value) return

        channel = supabase
            .channel(`game-comments-unread-${gameId.value}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_comments',
                    filter: `game_id=eq.${gameId.value}`
                },
                () => {
                    void fetchUnreadCount()
                }
            )
            .subscribe()
    }

    onMounted(async () => {
        await ensureAuthReady()
        await fetchUnreadCount()
        subscribe()

        pollTimer = window.setInterval(() => {
            void fetchUnreadCount()
        }, 5000)
    })

    onUnmounted(() => {
        if (channel) void supabase.removeChannel(channel)
        if (pollTimer) window.clearInterval(pollTimer)
    })

    watch(
        () => auth.user?.id,
        () => {
            void fetchUnreadCount()
            subscribe()
        }
    )

    return {
        unreadCount,
        setUnreadCount: (count: number) => {
            unreadCount.value = count
        },
        fetchUnreadCount
    }
}

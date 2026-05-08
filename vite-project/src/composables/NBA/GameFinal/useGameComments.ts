import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '../../../lib/supabase'
import { isRealtimeEnabled } from '../../../lib/realtime'
import { useAuthStore } from '../../../stores/auth'
import { authFetch } from '../../../api/authFetch'

export type GameComment = {
    id: string
    game_id: string
    user_id: string
    message: string
    image_data: string | null
    reply_to_id: string | null
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

type NewGameComment = {
    gameId: string
    message: string
    imageData: string | null
    replyToId: string | null
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
    const queryClient = useQueryClient()
    const message = ref('')
    const imageData = ref<string | null>(null)
    const imageName = ref('')
    const replyTo = ref<GameComment | null>(null)
    const unreadCount = ref(0)
    const error = ref<string | null>(null)

    let channel: ReturnType<typeof supabase.channel> | null = null
    const commentsQueryKey = computed(() => ['game-comments', gameId.value])

    const canSend = computed(() =>
        Boolean(auth.user && (message.value.trim() || imageData.value))
    )

    const ensureAuthReady = async () => {
        if (!auth.user) {
            await auth.init()
            auth.subscribeAuthState()
        }

        if (!auth.user) {
            const { data } = await supabase.auth.getSession()
            if (data.session?.user) {
                await auth.init()
            }
        }
    }

    const fetchCommentsData = async () => {
        await ensureAuthReady()

        if (!auth.user || !gameId.value) return []

        const data = await authFetch(`/api/game-comments/${encodeURIComponent(gameId.value)}`)
        return ((data.comments ?? []) as unknown as RawGameComment[]).map(normalizeComment)
    }

    const commentsQuery = useQuery({
        queryKey: commentsQueryKey,
        enabled: computed(() => Boolean(gameId.value)),
        refetchInterval: 5000,
        queryFn: fetchCommentsData
    })

    const sortedComments = computed(() =>
        [...(commentsQuery.data.value ?? [])].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    )

    const fetchComments = async () => {
        error.value = null

        try {
            await commentsQuery.refetch()
        } catch (e: any) {
            error.value = e?.message || 'Не удалось загрузить комментарии'
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

    const setReplyTo = (comment: GameComment) => {
        replyTo.value = comment
    }

    const clearReplyTo = () => {
        replyTo.value = null
    }

    const sendCommentMutation = useMutation({
        mutationFn: async (newComment: NewGameComment) => {
            await ensureAuthReady()

            if (!auth.user) {
                error.value = 'Сессия устарела. Обновите страницу или войдите снова.'
                throw new Error(error.value)
            }

            if (!newComment.gameId) {
                throw new Error('Игра не найдена')
            }

            if (!newComment.message.trim() && !newComment.imageData) {
                throw new Error('Комментарий пустой')
            }

            error.value = null

            const data = await authFetch('/api/game-comments', {
                method: 'POST',
                body: JSON.stringify({
                    gameId: newComment.gameId,
                    message: newComment.message,
                    imageData: newComment.imageData,
                    replyToId: newComment.replyToId
                })
            })

            if (!data?.comment) {
                throw new Error('Сервер не вернул сохранённый комментарий')
            }

            return normalizeComment(data.comment as RawGameComment)
        },
        onSuccess: (inserted) => {
            if (inserted) {
                queryClient.setQueryData<GameComment[]>(commentsQueryKey.value, (old = []) => [
                    ...old.filter(comment =>
                        comment.id !== inserted.id
                    ),
                    inserted
                ])
            }

            message.value = ''
            clearReplyTo()
            removeImage()
            void markAsRead()
            void commentsQuery.refetch()
        },
        onError: (e: any) => {
            error.value = e?.message || 'Не удалось отправить комментарий'
            void commentsQuery.refetch()
        }
    })

    const sendComment = async () => {
        await ensureAuthReady()

        if (!auth.user) {
            error.value = 'Сессия устарела. Обновите страницу или войдите снова.'
            return
        }

        if (!canSend.value) return

        if (sendCommentMutation.isPending.value) return

        const newComment = {
            gameId: gameId.value,
            message: message.value.trim(),
            imageData: imageData.value,
            replyToId: replyTo.value?.id ?? null
        }

        try {
            await sendCommentMutation.mutateAsync(newComment)
        } catch {
        }
    }

    const subscribe = () => {
        if (!isRealtimeEnabled()) return
        if (channel || !gameId.value) return

        channel = supabase
            .channel(`game-comments-${gameId.value}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_comments',
                    filter: `game_id=eq.${gameId.value}`
                },
                async (payload) => {
                    const incoming = payload.new as GameComment

                    if (payload.eventType === 'DELETE') {
                        queryClient.setQueryData<GameComment[]>(commentsQueryKey.value, (old = []) =>
                            old.filter(comment => comment.id !== (payload.old as { id?: string }).id)
                        )
                        await fetchUnreadCount()
                        return
                    }

                    const existing = commentsQuery.data.value ?? []
                    if (!existing.some(comment => comment.id === incoming.id)) {
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
    })

    onUnmounted(() => {
        void unsubscribe()
    })

    watch(
        () => auth.user?.id,
        async () => {
            await fetchComments()
            await fetchUnreadCount()
            subscribe()
        }
    )

    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            await ensureAuthReady()

            if (!auth.user) {
                throw new Error('Сессия устарела. Обновите страницу или войдите снова.')
            }

            await authFetch(`/api/game-comments/${encodeURIComponent(commentId)}`, {
                method: 'DELETE'
            })

            return commentId
        },
        onSuccess: (commentId) => {
            queryClient.setQueryData<GameComment[]>(commentsQueryKey.value, (old = []) =>
                old.filter(comment => comment.id !== commentId)
            )
            if (replyTo.value?.id === commentId) clearReplyTo()
            void fetchUnreadCount()
        },
        onError: (e: any) => {
            error.value = e?.message || 'Не удалось удалить комментарий'
            void commentsQuery.refetch()
        }
    })

    const deleteComment = async (comment: GameComment) => {
        if (deleteCommentMutation.isPending.value) return
        if (comment.user_id !== auth.user?.id && !auth.user?.isAdmin) return

        try {
            await deleteCommentMutation.mutateAsync(comment.id)
        } catch {
        }
    }

    return {
        user: computed(() => auth.user),
        comments: sortedComments,
        message,
        imageData,
        imageName,
        replyTo,
        loading: computed(() => commentsQuery.isFetching.value && sortedComments.value.length === 0),
        sending: computed(() => sendCommentMutation.isPending.value),
        deleting: computed(() => deleteCommentMutation.isPending.value),
        unreadCount,
        error,
        canSend,
        attachImage,
        removeImage,
        setReplyTo,
        clearReplyTo,
        sendComment,
        deleteComment,
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
        if (!isRealtimeEnabled()) return
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

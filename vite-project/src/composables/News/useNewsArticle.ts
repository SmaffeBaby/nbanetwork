import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'
import type { NewsArticle } from '../../utils/news'
import { sanitizeNewsHtml } from '../../utils/news'

export function useNewsArticle() {
  const route = useRoute()
  const auth = useAuthStore()
  const article = ref<NewsArticle | null>(null)
  const loading = ref(false)
  const error = ref('')
  const likesCount = ref(0)
  const liked = ref(false)
  const copied = ref(false)
  const sanitizedHtml = computed(() => article.value ? sanitizeNewsHtml(article.value.content_html) : '')

  const fetchLikes = async () => {
    if (!article.value) return

    try {
      const data = await authFetch(`/api/news-articles/${article.value.id}/likes`)
      likesCount.value = data.count ?? 0
      liked.value = Boolean(data.liked)
    } catch {
      likesCount.value = 0
      liked.value = false
    }
  }

  const fetchArticle = async () => {
    loading.value = true
    error.value = ''
    article.value = null

    try {
      const slug = encodeURIComponent(String(route.params.slug ?? ''))
      const response = await fetch(`/api/news-articles/by-slug/${slug}`)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Статья не найдена')
      article.value = data.article
      await fetchLikes()
    } catch (fetchError: any) {
      error.value = fetchError?.message || 'Не удалось загрузить статью'
    } finally {
      loading.value = false
    }
  }

  const toggleLike = async () => {
    if (!article.value) return

    try {
      await authFetch(`/api/news-articles/${article.value.id}/likes`, {
        method: liked.value ? 'DELETE' : 'POST'
      })
      liked.value = !liked.value
      likesCount.value += liked.value ? 1 : -1
    } catch {
    }
  }

  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1600)
  }

  onMounted(async () => {
    await auth.init()
    await fetchArticle()
  })

  watch(() => route.params.slug, () => {
    void fetchArticle()
  })

  return {
    article,
    loading,
    error,
    likesCount,
    liked,
    copied,
    sanitizedHtml,
    toggleLike,
    copyLink
  }
}

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authFetch } from '../../api/authFetch'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import type { NewsArticle } from '../../utils/news'

const pageSize = 6

export function useNewsList() {
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  const articles = ref<NewsArticle[]>([])
  const editingArticle = ref<NewsArticle | null>(null)
  const showEditor = ref(false)
  const loading = ref(false)
  const error = ref('')
  const page = ref(1)
  const total = ref(0)
  const search = ref(String(route.query.q ?? ''))
  const activeTag = ref(String(route.query.tag ?? ''))

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  const fetchArticles = async () => {
    loading.value = true
    error.value = ''

    const from = (page.value - 1) * pageSize
    const to = from + pageSize - 1
    let query = supabase
      .from('news_articles')
      .select('*, profiles!news_articles_author_id_fkey(first_name, last_name, avatar_img)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (activeTag.value) {
      query = query.contains('hashtags', [activeTag.value])
    }

    const searchTerm = search.value.trim()
    if (searchTerm) {
      const escaped = searchTerm.replace(/[%_,]/g, '')
      query = query.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`)
    }

    const { data, error: fetchError, count } = await query
    loading.value = false

    if (fetchError) {
      error.value = fetchError.message
      articles.value = []
      total.value = 0
      return
    }

    articles.value = (data ?? []) as NewsArticle[]
    total.value = count ?? 0
  }

  const applySearch = () => {
    page.value = 1
    void router.replace({ path: '/news', query: { ...route.query, q: search.value.trim() || undefined } })
    void fetchArticles()
  }

  const setTag = (tag: string) => {
    activeTag.value = tag
    page.value = 1
    void router.replace({ path: '/news', query: { tag } })
    void fetchArticles()
  }

  const clearTag = () => {
    activeTag.value = ''
    void router.replace({ path: '/news', query: search.value.trim() ? { q: search.value.trim() } : {} })
    void fetchArticles()
  }

  const startCreate = () => {
    editingArticle.value = null
    showEditor.value = true
  }

  const startEdit = (article: NewsArticle) => {
    editingArticle.value = article
    showEditor.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openArticle = (article: NewsArticle) => {
    void router.push({ name: 'NewsArticle', params: { slug: article.slug || article.id } })
  }

  const closeEditor = () => {
    showEditor.value = false
    editingArticle.value = null
  }

  const handleSaved = () => {
    closeEditor()
    void fetchArticles()
  }

  const deleteArticle = async (article: NewsArticle) => {
    if (!window.confirm(`Удалить новость "${article.title}"?`)) return

    try {
      await authFetch(`/api/news-articles/${article.id}`, { method: 'DELETE' })
    } catch (deleteError: any) {
      error.value = deleteError?.message || 'Не удалось удалить новость.'
      return
    }

    void fetchArticles()
  }

  watch(page, () => {
    void fetchArticles()
  })

  onMounted(async () => {
    await auth.init()
    void fetchArticles()
  })

  return {
    auth,
    articles,
    editingArticle,
    showEditor,
    loading,
    error,
    page,
    totalPages,
    search,
    activeTag,
    applySearch,
    setTag,
    clearTag,
    startCreate,
    startEdit,
    openArticle,
    closeEditor,
    handleSaved,
    deleteArticle
  }
}

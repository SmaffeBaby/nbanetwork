import { computed, onMounted, reactive, ref, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'

export type PatchLink = {
  label: string
  url: string
}

export type PatchNote = {
  id: string
  title: string
  body: string
  links: PatchLink[]
  created_at: string
}

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis'

export function usePatchNotes() {
  const auth = useAuthStore()
  const patchNotes = ref<PatchNote[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const deletingId = ref('')
  const error = ref('')
  const formError = ref('')
  const showForm = ref(false)
  const editingId = ref('')
  const selectedPatchDate = ref('')
  const currentPage = ref(1)
  const pageSize = 5

  const form = reactive({
    title: '',
    body: '',
    links: [] as PatchLink[]
  })

  const normalizeLinks = () => form.links
    .map(link => ({
      label: link.label.trim(),
      url: link.url.trim()
    }))
    .filter(link => link.url)

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  const getDateKey = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const fetchPatchNotes = async () => {
    loading.value = true
    error.value = ''

    const { data, error: fetchError } = await supabase
      .from('patch_notes')
      .select('id, title, body, links, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })

    loading.value = false

    if (fetchError) {
      error.value = fetchError.message
      patchNotes.value = []
      return
    }

    patchNotes.value = (data ?? []).map(note => ({
      ...note,
      links: Array.isArray(note.links) ? note.links as PatchLink[] : []
    }))

    if (selectedPatchDate.value && !patchDateSet.value.has(selectedPatchDate.value)) {
      selectedPatchDate.value = ''
    }
  }

  const addLink = () => {
    form.links.push({ label: '', url: '' })
  }

  const removeLink = (index: number) => {
    form.links.splice(index, 1)
  }

  const resetForm = () => {
    form.title = ''
    form.body = ''
    form.links = []
    formError.value = ''
    editingId.value = ''
  }

  const closeForm = () => {
    resetForm()
    showForm.value = false
  }

  const openCreateForm = () => {
    if (!auth.user?.isAdmin) return

    resetForm()
    showForm.value = true
  }

  const startEditPatchNote = (note: PatchNote) => {
    if (!auth.user?.isAdmin) return

    editingId.value = note.id
    form.title = note.title
    form.body = note.body
    form.links = note.links.map(link => ({ ...link }))
    formError.value = ''
    showForm.value = true
  }

  const savePatchNote = async () => {
    if (!auth.user?.isAdmin) return

    const title = form.title.trim()
    const body = form.body.trim()
    const links = normalizeLinks()

    if (!title || !body) {
      formError.value = 'Добавьте заголовок и текст патча.'
      return
    }

    if (links.some(link => !isValidUrl(link.url))) {
      formError.value = 'Ссылки должны начинаться с http:// или https://.'
      return
    }

    saving.value = true
    formError.value = ''

    const payload = {
      title,
      body,
      links,
      published: true
    }

    const { error: saveError } = editingId.value
      ? await supabase
        .from('patch_notes')
        .update(payload)
        .eq('id', editingId.value)
      : await supabase
        .from('patch_notes')
        .insert({
          ...payload,
          author_id: auth.user.id
        })

    saving.value = false

    if (saveError) {
      formError.value = saveError.message
      return
    }

    closeForm()
    await fetchPatchNotes()
  }

  const deletePatchNote = async (note: PatchNote) => {
    if (!auth.user?.isAdmin) return

    const confirmed = window.confirm(`Удалить патч "${note.title}"?`)
    if (!confirmed) return

    deletingId.value = note.id
    formError.value = ''

    const { error: deleteError } = await supabase
      .from('patch_notes')
      .delete()
      .eq('id', note.id)

    deletingId.value = ''

    if (deleteError) {
      error.value = deleteError.message
      return
    }

    if (editingId.value === note.id) {
      closeForm()
    }

    await fetchPatchNotes()
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))

  const patchDates = computed(() => {
    const dates = patchNotes.value
      .map(note => getDateKey(note.created_at))
      .filter(Boolean)

    return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a))
  })

  const patchDateSet = computed(() => new Set(patchDates.value))

  const filteredPatchNotes = computed(() => {
    if (!selectedPatchDate.value) return patchNotes.value

    return patchNotes.value.filter(note => getDateKey(note.created_at) === selectedPatchDate.value)
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(filteredPatchNotes.value.length / pageSize)))

  const paginatedPatchNotes = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredPatchNotes.value.slice(start, start + pageSize)
  })

  const paginationItems = computed<PaginationItem[]>(() => {
    const pages = totalPages.value

    if (pages <= 5) {
      return Array.from({ length: pages }, (_, index) => index + 1)
    }

    const visiblePages = new Set([
      1,
      pages,
      currentPage.value,
      currentPage.value - 1,
      currentPage.value + 1
    ])

    if (currentPage.value <= 3) {
      visiblePages.add(2)
      visiblePages.add(3)
      visiblePages.add(4)
    }

    if (currentPage.value >= pages - 2) {
      visiblePages.add(pages - 3)
      visiblePages.add(pages - 2)
      visiblePages.add(pages - 1)
    }

    const normalizedPages = Array.from(visiblePages)
      .filter(page => page >= 1 && page <= pages)
      .sort((a, b) => a - b)

    return normalizedPages.reduce<PaginationItem[]>((items, page, index) => {
      const previousPage = normalizedPages[index - 1]

      if (previousPage && page - previousPage > 1) {
        items.push(previousPage === 1 ? 'start-ellipsis' : 'end-ellipsis')
      }

      items.push(page)
      return items
    }, [])
  })

  const setPage = (page: number) => {
    currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  }

  const clearSelectedPatchDate = () => {
    selectedPatchDate.value = ''
  }

  watch([selectedPatchDate, filteredPatchNotes], () => {
    currentPage.value = 1
  })

  watch(totalPages, (pages) => {
    if (currentPage.value > pages) {
      currentPage.value = pages
    }
  })

  onMounted(async () => {
    await auth.init()
    await fetchPatchNotes()
  })

  return {
    auth,
    patchNotes,
    filteredPatchNotes,
    paginatedPatchNotes,
    patchDates,
    loading,
    saving,
    deletingId,
    error,
    formError,
    showForm,
    editingId,
    selectedPatchDate,
    currentPage,
    totalPages,
    paginationItems,
    form,
    addLink,
    removeLink,
    openCreateForm,
    closeForm,
    startEditPatchNote,
    savePatchNote,
    deletePatchNote,
    clearSelectedPatchDate,
    setPage,
    formatDate
  }
}

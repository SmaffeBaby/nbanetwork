import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { authFetch } from '../../api/authFetch'
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
  const draftId = ref('')
  const draftOwner = ref('')
  const draftStatus = ref('')
  let revision = 0
  let restoring = false
  let fetchRevision = 0

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

  const draftKey = (owner: string) => `basketsfera:patch-draft:v1:${owner}`
  const persistDraft = () => {
    if (restoring || !showForm.value || !draftOwner.value || !draftId.value) return
    try {
      sessionStorage.setItem(draftKey(draftOwner.value), JSON.stringify({ id:draftId.value, editingId:editingId.value, title:form.title, body:form.body, links:form.links }))
      draftStatus.value = 'Черновик сохранён в этой вкладке'
    } catch { draftStatus.value = 'Не удалось сохранить черновик в браузере. Не закрывайте вкладку до публикации.' }
  }
  const restoreDraft = (owner: string) => {
    if (showForm.value && draftOwner.value === owner) return
    restoring = true
    try {
      const raw = sessionStorage.getItem(draftKey(owner))
      const draft = raw ? JSON.parse(raw) : null
      resetForm()
      showForm.value = false
      draftOwner.value = owner
      if (draft && typeof draft.id === 'string' && typeof draft.title === 'string' && typeof draft.body === 'string' && Array.isArray(draft.links)) {
        draftId.value = draft.id
        editingId.value = typeof draft.editingId === 'string' ? draft.editingId : ''
        form.title = draft.title
        form.body = draft.body
        form.links = draft.links.filter((link: any) => typeof link?.label === 'string' && typeof link?.url === 'string')
        showForm.value = true
        draftStatus.value = 'Черновик восстановлен'
      }
    } catch { /* An unavailable/corrupt draft must not block the editor. */ }
    finally { restoring = false }
  }
  watch(form, () => { revision++; persistDraft() }, { deep:true, flush:'sync' })


  const fetchPatchNotes = async () => {
    const request = ++fetchRevision
    loading.value = true
    error.value = ''
    try {
      const response = await fetch('/api/patch-notes', { signal:AbortSignal.timeout(10000),cache:'no-cache' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить патчи')
      if (request !== fetchRevision) return
      patchNotes.value = (data.notes ?? []).map((note: PatchNote) => ({ ...note,links:Array.isArray(note.links)?note.links:[] }))
      if (selectedPatchDate.value && !patchDateSet.value.has(selectedPatchDate.value)) selectedPatchDate.value = ''
    } catch (failure: any) {
      if (request === fetchRevision) error.value = failure?.name === 'TimeoutError' ? 'Сервер отвечает дольше обычного. Повторите загрузку.' : failure.message || 'Не удалось загрузить патчи'
    } finally { if (request === fetchRevision) loading.value = false }
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
    draftId.value = ''
    draftStatus.value = ''
  }

  const closeForm = () => {
    if (draftOwner.value) { try { sessionStorage.removeItem(draftKey(draftOwner.value)) } catch { /* Storage is optional. */ } }
    showForm.value = false
    resetForm()
  }

  const openCreateForm = () => {
    if (!auth.user?.isAdmin) return

    showForm.value = false
    resetForm()
    draftOwner.value = auth.user.id
    draftId.value = crypto.randomUUID()
    showForm.value = true
    persistDraft()
  }

  const startEditPatchNote = (note: PatchNote) => {
    if (!auth.user?.isAdmin) return

    showForm.value = false
    draftOwner.value = auth.user.id
    draftId.value = note.id
    editingId.value = note.id
    form.title = note.title
    form.body = note.body
    form.links = note.links.map(link => ({ ...link }))
    formError.value = ''
    showForm.value = true
    persistDraft()
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

    if (saving.value) return
    const owner = auth.user.id, id = draftId.value || editingId.value || crypto.randomUUID()
    draftId.value = id
    const savedRevision = revision
    persistDraft()
    saving.value = true
    formError.value = ''
    try {
      const result = await authFetch(`/api/patch-notes/${id}`, { method:'PUT', body:JSON.stringify({title,body,links}) })
      if (auth.user?.id !== owner || draftOwner.value !== owner || draftId.value !== id) return
      if (result.note) patchNotes.value = [result.note, ...patchNotes.value.filter(note => note.id !== id)].sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at))
      if (revision === savedRevision) closeForm()
      else { editingId.value = id; persistDraft() }
      await fetchPatchNotes()
    } catch (failure: any) {
      if (draftOwner.value === owner && draftId.value === id) {
        formError.value = failure.message || 'Не удалось сохранить патч. Черновик сохранён, попробуйте ещё раз.'
        persistDraft()
      }
    } finally { saving.value = false }
  }

  const deletePatchNote = async (note: PatchNote) => {
    if (!auth.user?.isAdmin || deletingId.value) return
    if (!window.confirm(`Удалить патч "${note.title}"?`)) return
    const owner = auth.user.id
    deletingId.value = note.id
    try {
      await authFetch(`/api/patch-notes/${note.id}`, { method:'DELETE' })
      if (auth.user?.id !== owner) return
      if (editingId.value === note.id) closeForm()
      await fetchPatchNotes()
    } catch (failure: any) { error.value = failure.message || 'Не удалось удалить патч' }
    finally { deletingId.value = '' }
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

  watch(() => [auth.user?.id, auth.user?.isAdmin] as const, ([owner, admin]) => {
    if (owner && admin) restoreDraft(owner)
  }, { immediate:true, flush:'post' })

  const onVisibility = () => { if (document.hidden) persistDraft() }
  onMounted(() => {
    void auth.init()
    void fetchPatchNotes()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persistDraft)
  })
  onUnmounted(() => {
    persistDraft()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', persistDraft)
    fetchRevision++
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
    draftStatus,
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

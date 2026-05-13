import { onMounted, reactive, ref } from 'vue'
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

export function usePatchNotes() {
  const auth = useAuthStore()
  const patchNotes = ref<PatchNote[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const formError = ref('')
  const showForm = ref(false)

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

    const { error: insertError } = await supabase
      .from('patch_notes')
      .insert({
        author_id: auth.user.id,
        title,
        body,
        links,
        published: true
      })

    saving.value = false

    if (insertError) {
      formError.value = insertError.message
      return
    }

    resetForm()
    showForm.value = false
    await fetchPatchNotes()
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))

  onMounted(async () => {
    await auth.init()
    await fetchPatchNotes()
  })

  return {
    auth,
    patchNotes,
    loading,
    saving,
    error,
    formError,
    showForm,
    form,
    addLink,
    removeLink,
    savePatchNote,
    formatDate
  }
}

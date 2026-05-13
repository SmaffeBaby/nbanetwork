import { nextTick, onMounted, ref, watch } from 'vue'
import { authFetch } from '../../api/authFetch'
import {
  makeExcerpt,
  makeSlug,
  normalizeGameId,
  normalizeHashtag,
  sanitizeNewsHtml,
  type NewsArticle
} from '../../utils/news'

type NewsEditorProps = {
  article: NewsArticle | null
  authorId: string
}

type NewsEditorEmit = {
  (e: 'saved'): void
  (e: 'cancel'): void
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

export function useNewsEditor(props: NewsEditorProps, emit: NewsEditorEmit) {
  const editor = ref<HTMLElement | null>(null)
  const title = ref('')
  const contentHtml = ref('')
  const coverImageUrl = ref('')
  const gameIdsInput = ref('')
  const teamAbbrsInput = ref('')
  const hashtagsInput = ref('')
  const published = ref(true)
  const saving = ref(false)
  const error = ref('')
  const selectedImage = ref<HTMLImageElement | null>(null)

  const resetForm = async () => {
    title.value = props.article?.title ?? ''
    contentHtml.value = props.article?.content_html ?? '<p></p>'
    coverImageUrl.value = props.article?.cover_image_url ?? ''
    gameIdsInput.value = props.article?.game_ids?.join(', ') ?? ''
    teamAbbrsInput.value = props.article?.team_abbrs?.join(', ') ?? ''
    hashtagsInput.value = props.article?.hashtags?.map(tag => `#${tag}`).join(', ') ?? ''
    published.value = props.article?.published ?? true
    error.value = ''

    await nextTick()
    if (editor.value) editor.value.innerHTML = contentHtml.value
  }

  const syncContent = () => {
    contentHtml.value = editor.value?.innerHTML ?? ''
  }

  const runCommand = (command: string, value?: string) => {
    editor.value?.focus()
    document.execCommand(command, false, value)
    syncContent()
  }

  const insertSourcesBlock = () => {
    editor.value?.focus()
    document.execCommand(
      'insertHTML',
      false,
      '<section class="news-sources"><h3>Источники</h3><ul><li><a href="https://example.com" target="_blank" rel="noopener noreferrer">Название источника</a></li></ul></section><p></p>'
    )
    syncContent()
  }

  const handleBlockFormat = (event: Event) => {
    const select = event.target as HTMLSelectElement
    if (select.value === 'sources') insertSourcesBlock()
    else runCommand('formatBlock', select.value)
    select.value = 'p'
  }

  const addLink = () => {
    const url = window.prompt('URL ссылки')
    if (!url) return
    runCommand('createLink', url)
  }

  const addImageByUrl = () => {
    const url = window.prompt('URL изображения')
    if (!url) return
    runCommand('insertImage', url)
  }

  const addImageFile = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      error.value = 'Можно загружать только изображения.'
      input.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      error.value = 'Изображение должно быть меньше 5 МБ.'
      input.value = ''
      return
    }

    error.value = ''
    void fileToDataUrl(file).then(result => {
      runCommand('insertImage', result)
      input.value = ''
    })
  }

  const addCoverFile = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      error.value = 'Обложкой может быть только изображение.'
      input.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      error.value = 'Обложка должна быть меньше 5 МБ.'
      input.value = ''
      return
    }

    error.value = ''
    void fileToDataUrl(file).then(result => {
      coverImageUrl.value = result
      input.value = ''
    })
  }

  const selectEditorImage = (event: MouseEvent) => {
    if (selectedImage.value) selectedImage.value.classList.remove('is-selected-news-image')
    const target = event.target
    selectedImage.value = target instanceof HTMLImageElement ? target : null
    selectedImage.value?.classList.add('is-selected-news-image')
  }

  const moveSelectedImage = (direction: 'up' | 'down') => {
    const image = selectedImage.value
    if (!image) return

    const block = image.closest('p, div, figure') ?? image
    const sibling = direction === 'up' ? block.previousElementSibling : block.nextElementSibling
    if (!sibling || !block.parentElement) return

    if (direction === 'up') block.parentElement.insertBefore(block, sibling)
    else block.parentElement.insertBefore(sibling, block)
    syncContent()
  }

  const removeSelectedImage = () => {
    selectedImage.value?.remove()
    selectedImage.value = null
    syncContent()
  }

  const save = async () => {
    if (saving.value) return

    syncContent()
    const cleanHtml = sanitizeNewsHtml(contentHtml.value)
    const gameIds = Array.from(new Set(gameIdsInput.value.split(/[\s,;]+/).map(normalizeGameId).filter(Boolean)))
    const teamAbbrs = Array.from(new Set(teamAbbrsInput.value.split(/[\s,;]+/).map(item => item.trim().toUpperCase()).filter(Boolean)))
    const hashtags = Array.from(new Set(hashtagsInput.value.split(/[\s,;]+/).map(normalizeHashtag).filter(Boolean)))

    if (!title.value.trim() || !makeExcerpt(cleanHtml, 1000)) {
      error.value = 'Нужны заголовок и текст новости.'
      return
    }

    saving.value = true
    error.value = ''

    const payload = {
      author_id: props.article?.author_id ?? props.authorId,
      title: title.value.trim(),
      slug: props.article?.slug ?? makeSlug(title.value),
      excerpt: makeExcerpt(cleanHtml),
      content_html: cleanHtml,
      cover_image_url: coverImageUrl.value.trim() || null,
      game_ids: gameIds,
      team_abbrs: teamAbbrs,
      hashtags,
      published: published.value
    }

    try {
      await authFetch(
        props.article ? `/api/news-articles/${props.article.id}` : '/api/news-articles',
        {
          method: props.article ? 'PATCH' : 'POST',
          body: JSON.stringify(payload)
        }
      )

      emit('saved')
    } catch (saveError: any) {
      error.value = saveError?.message || 'Не удалось сохранить новость.'
    } finally {
      saving.value = false
    }
  }

  watch(() => props.article, () => {
    void resetForm()
  })

  onMounted(() => {
    void resetForm()
  })

  return {
    editor,
    title,
    coverImageUrl,
    gameIdsInput,
    teamAbbrsInput,
    hashtagsInput,
    published,
    saving,
    error,
    selectedImage,
    syncContent,
    runCommand,
    handleBlockFormat,
    addLink,
    addImageByUrl,
    addImageFile,
    addCoverFile,
    selectEditorImage,
    moveSelectedImage,
    removeSelectedImage,
    save
  }
}

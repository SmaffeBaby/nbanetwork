import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

export type NewsSlide = {
  id: string
  image_url: string
  mobile_image_url: string | null
  link_url: string | null
  sort_order: number
}

const SLIDES_QUERY_KEY = ['news-slider'] as const
const SLIDES_STALE_TIME = 5 * 60 * 1000
const SLIDES_CACHE_TIME = 30 * 60 * 1000

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MIN_SLIDE_INTERVAL = 9000
const EXTRA_INTERVAL_PER_SLIDE = 500
const MAX_SLIDE_INTERVAL = 14000

type PendingImageUpload = {
  dataUrl: string
  fileName: string
  contentType: string
}

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const contentTypeFromDataUrl = (dataUrl: string) => {
  const match = /^data:([^;,]+);/i.exec(dataUrl)
  return match?.[1]?.toLowerCase() || 'application/octet-stream'
}

const normalizeUrl = (value: string) => value.trim()

const isValidImageUrl = (value: string) => /^(https?:\/\/|\/)/i.test(value.trim())

export function useNewsSlider() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const slidesQuery = useQuery({
    queryKey: SLIDES_QUERY_KEY,
    queryFn: async ({ signal }): Promise<NewsSlide[]> => {
      // Revalidate HTTP caches too, especially immediately after an admin edit.
      const response = await fetch('/api/news-slider', { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), cache: 'no-cache' })
      if (!response.ok) throw new Error(`Не удалось загрузить слайды (${response.status}).`)
      const data = await response.json()
      if (!Array.isArray(data.slides) || !data.slides.every((slide: NewsSlide) =>
        slide && typeof slide.id === 'string' && typeof slide.image_url === 'string' && slide.image_url.trim()
      )) {
        throw new Error('Сервер вернул некорректный список слайдов.')
      }
      return data.slides
    },
    staleTime: SLIDES_STALE_TIME,
    gcTime: SLIDES_CACHE_TIME,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })
  const slides = computed(() => slidesQuery.data.value ?? [])
  const activeIndex = ref(0)
  const loading = computed(() => slidesQuery.isPending.value && !slides.value.length)
  const loadError = computed(() => slidesQuery.isError.value && !slides.value.length)
  const retrySlides = () => slidesQuery.refetch()
  const saving = ref(false)
  const showForm = ref(false)
  const editingSlide = ref<NewsSlide | null>(null)
  const imageUrl = ref('')
  const mobileImageUrl = ref('')
  const imageUpload = ref<PendingImageUpload | null>(null)
  const mobileImageUpload = ref<PendingImageUpload | null>(null)
  const linkUrl = ref('')
  const sortOrder = ref(1)
  const formError = ref('')
  let timer: number | null = null
  let visibilityHandler: (() => void) | null = null

  const isAdmin = computed(() => auth.user?.isAdmin === true)
  const activeSlide = computed(() => slides.value[activeIndex.value] ?? slides.value[0])
  const hasDesktopImage = computed(() => Boolean(imageUpload.value || normalizeUrl(imageUrl.value)))

  const refreshSlides = async () => {
    // Cancel a pre-mutation request so it cannot overwrite the updated list.
    await queryClient.cancelQueries({ queryKey: SLIDES_QUERY_KEY })
    await queryClient.invalidateQueries({ queryKey: SLIDES_QUERY_KEY })
  }

  const attachImage = async (event: Event, target: 'desktop' | 'mobile') => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      formError.value = 'Можно загрузить только изображение.'
      input.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      formError.value = 'Изображение должно быть меньше 5 МБ.'
      input.value = ''
      return
    }

    formError.value = ''
    const dataUrl = await fileToDataUrl(file)
    const upload = {
      dataUrl,
      fileName: file.name,
      contentType: contentTypeFromDataUrl(dataUrl)
    }

    if (target === 'desktop') {
      imageUpload.value = upload
      imageUrl.value = ''
    } else {
      mobileImageUpload.value = upload
      mobileImageUrl.value = ''
    }
    input.value = ''
  }

  const resetForm = () => {
    imageUrl.value = ''
    mobileImageUrl.value = ''
    imageUpload.value = null
    mobileImageUpload.value = null
    linkUrl.value = ''
    sortOrder.value = 1
    formError.value = ''
    editingSlide.value = null
  }

  const startCreate = () => {
    if (showForm.value && !editingSlide.value) {
      showForm.value = false
      return
    }

    resetForm()
    showForm.value = true
  }

  const startEdit = (slide: NewsSlide) => {
    editingSlide.value = slide
    imageUrl.value = slide.image_url
    mobileImageUrl.value = slide.mobile_image_url ?? ''
    imageUpload.value = null
    mobileImageUpload.value = null
    linkUrl.value = slide.link_url ?? ''
    sortOrder.value = slide.sort_order ?? 1
    formError.value = ''
    showForm.value = true
  }

  const cancelForm = () => {
    resetForm()
    showForm.value = false
  }

  const uploadSliderImage = async (upload: PendingImageUpload) => {
    const response = await authFetch('/api/news-slider/assets', {
      method: 'POST',
      body: JSON.stringify(upload)
    })

    if (!response?.url) {
      throw new Error('Сервер не вернул ссылку на изображение.')
    }

    return String(response.url)
  }

  const resolveImageUrl = async (upload: PendingImageUpload | null, url: string) => {
    if (upload) return uploadSliderImage(upload)

    const normalized = normalizeUrl(url)
    if (!normalized) return ''
    if (!isValidImageUrl(normalized)) {
      throw new Error('Ссылка на изображение должна начинаться с http://, https:// или /.')
    }

    return normalized
  }

  const saveSlide = async () => {
    if (!hasDesktopImage.value || saving.value) return
    saving.value = true
    formError.value = ''

    try {
      const slide = editingSlide.value
      const resolvedImageUrl = await resolveImageUrl(imageUpload.value, imageUrl.value)
      const resolvedMobileImageUrl = await resolveImageUrl(mobileImageUpload.value, mobileImageUrl.value)

      await authFetch(slide ? `/api/news-slider/${slide.id}` : '/api/news-slider', {
        method: slide ? 'PATCH' : 'POST',
        body: JSON.stringify({
          image_url: resolvedImageUrl,
          mobile_image_url: resolvedMobileImageUrl || null,
          link_url: linkUrl.value.trim() || null,
          sort_order: Math.max(1, Math.trunc(Number(sortOrder.value) || 1))
        })
      })
      resetForm()
      showForm.value = false
      await refreshSlides()
    } catch (error: any) {
      formError.value = error?.message || 'Не удалось сохранить слайд.'
    } finally {
      saving.value = false
    }
  }

  const deleteSlide = async (slide: NewsSlide) => {
    if (saving.value) return
    saving.value = true
    formError.value = ''
    try {
      await authFetch(`/api/news-slider/${slide.id}`, { method: 'DELETE' })
      await refreshSlides()
    } catch (error: any) {
      formError.value = error?.message || 'Не удалось удалить слайд.'
    } finally {
      saving.value = false
    }
  }

  const nextSlide = () => {
    if (slides.value.length < 2) return
    activeIndex.value = (activeIndex.value + 1) % slides.value.length
  }

  const prevSlide = () => {
    if (slides.value.length < 2) return
    activeIndex.value = (activeIndex.value - 1 + slides.value.length) % slides.value.length
  }

  const stopTimer = () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
  }

  const startTimer = () => {
    stopTimer()
    if (document.hidden || showForm.value || slides.value.length < 2) return
    const interval = Math.min(
      MAX_SLIDE_INTERVAL,
      MIN_SLIDE_INTERVAL + Math.max(slides.value.length - 1, 0) * EXTRA_INTERVAL_PER_SLIDE
    )
    timer = window.setInterval(nextSlide, interval)
  }

  const goToSlide = (index: number) => {
    if (!slides.value[index]) return
    activeIndex.value = index
    startTimer()
  }

  const nextSlideManually = () => {
    nextSlide()
    startTimer()
  }

  const prevSlideManually = () => {
    prevSlide()
    startTimer()
  }

  watch(slides, (items, previous) => {
    const activeId = previous?.[activeIndex.value]?.id
    const index = items.findIndex(slide => slide.id === activeId)
    activeIndex.value = index >= 0 ? index : Math.min(activeIndex.value, Math.max(items.length - 1, 0))
    startTimer()
  })
  watch(showForm, startTimer)

  onMounted(() => {
    startTimer()
    visibilityHandler = startTimer
    document.addEventListener('visibilitychange', visibilityHandler)
  })

  onUnmounted(() => {
    stopTimer()
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
  })

  return {
    slides,
    activeIndex,
    loading,
    loadError,
    retrySlides,
    saving,
    showForm,
    editingSlide,
    imageUrl,
    mobileImageUrl,
    imageUpload,
    mobileImageUpload,
    hasDesktopImage,
    linkUrl,
    sortOrder,
    formError,
    isAdmin,
    activeSlide,
    attachImage,
    startCreate,
    startEdit,
    cancelForm,
    saveSlide,
    deleteSlide,
    goToSlide,
    nextSlide: nextSlideManually,
    prevSlide: prevSlideManually
  }
}

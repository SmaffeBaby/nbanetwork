import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

export type NewsSlide = {
  id: string
  image_url: string
  mobile_image_url: string | null
  link_url: string | null
  sort_order: number
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MIN_SLIDE_INTERVAL = 9000
const EXTRA_INTERVAL_PER_SLIDE = 500
const MAX_SLIDE_INTERVAL = 14000

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

export function useNewsSlider() {
  const auth = useAuthStore()
  const slides = ref<NewsSlide[]>([])
  const activeIndex = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const showForm = ref(false)
  const editingSlide = ref<NewsSlide | null>(null)
  const imageData = ref('')
  const mobileImageData = ref('')
  const linkUrl = ref('')
  const sortOrder = ref(1)
  const formError = ref('')
  let timer: number | null = null

  const isAdmin = computed(() => auth.user?.isAdmin === true)
  const activeSlide = computed(() => slides.value[activeIndex.value] ?? slides.value[0])

  const fetchSlides = async () => {
    loading.value = true
    try {
      const data = await fetch('/api/news-slider').then(response => response.json())
      slides.value = data.slides ?? []
      activeIndex.value = Math.min(activeIndex.value, Math.max(slides.value.length - 1, 0))
    } finally {
      loading.value = false
    }
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
    if (target === 'desktop') {
      imageData.value = dataUrl
    } else {
      mobileImageData.value = dataUrl
    }
    input.value = ''
  }

  const resetForm = () => {
    imageData.value = ''
    mobileImageData.value = ''
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
    imageData.value = slide.image_url
    mobileImageData.value = slide.mobile_image_url ?? ''
    linkUrl.value = slide.link_url ?? ''
    sortOrder.value = slide.sort_order ?? 1
    formError.value = ''
    showForm.value = true
  }

  const cancelForm = () => {
    resetForm()
    showForm.value = false
  }

  const saveSlide = async () => {
    if (!imageData.value || saving.value) return
    saving.value = true
    formError.value = ''

    try {
      const slide = editingSlide.value
      await authFetch(slide ? `/api/news-slider/${slide.id}` : '/api/news-slider', {
        method: slide ? 'PATCH' : 'POST',
        body: JSON.stringify({
          image_url: imageData.value,
          mobile_image_url: mobileImageData.value || null,
          link_url: linkUrl.value.trim() || null,
          sort_order: Math.max(1, Math.trunc(Number(sortOrder.value) || 1))
        })
      })
      resetForm()
      showForm.value = false
      await fetchSlides()
    } catch (error: any) {
      formError.value = error?.message || 'Не удалось сохранить слайд.'
    } finally {
      saving.value = false
    }
  }

  const deleteSlide = async (slide: NewsSlide) => {
    await authFetch(`/api/news-slider/${slide.id}`, { method: 'DELETE' })
    await fetchSlides()
  }

  const nextSlide = () => {
    if (slides.value.length < 2) return
    activeIndex.value = (activeIndex.value + 1) % slides.value.length
  }

  const prevSlide = () => {
    if (slides.value.length < 2) return
    activeIndex.value = (activeIndex.value - 1 + slides.value.length) % slides.value.length
  }

  const startTimer = () => {
    if (timer) window.clearInterval(timer)
    if (slides.value.length < 2) return
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

  watch(() => slides.value.length, startTimer)

  onMounted(async () => {
    await auth.init()
    await fetchSlides()
    startTimer()
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  return {
    slides,
    activeIndex,
    loading,
    saving,
    showForm,
    editingSlide,
    imageData,
    mobileImageData,
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

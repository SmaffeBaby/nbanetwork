import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

export type NewsSlide = {
  id: string
  image_url: string
  link_url: string | null
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

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
  const imageData = ref('')
  const linkUrl = ref('')
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

  const attachImage = async (event: Event) => {
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
    imageData.value = await fileToDataUrl(file)
    input.value = ''
  }

  const saveSlide = async () => {
    if (!imageData.value || saving.value) return
    saving.value = true
    formError.value = ''

    try {
      await authFetch('/api/news-slider', {
        method: 'POST',
        body: JSON.stringify({
          image_url: imageData.value,
          link_url: linkUrl.value.trim() || null
        })
      })
      imageData.value = ''
      linkUrl.value = ''
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
    timer = window.setInterval(nextSlide, 6000)
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
    imageData,
    linkUrl,
    formError,
    isAdmin,
    activeSlide,
    attachImage,
    saveSlide,
    deleteSlide,
    nextSlide,
    prevSlide
  }
}

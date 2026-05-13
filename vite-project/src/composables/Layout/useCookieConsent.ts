import { onMounted, ref } from 'vue'

const STORAGE_KEY = 'nba-mom-cookie-consent'
const CONSENT_VERSION = 1

export function useCookieConsent() {
  const isVisible = ref(false)
  const analyticsAccepted = ref(false)

  const saveConsent = (acceptAnalytics: boolean) => {
    const payload = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: acceptAnalytics || analyticsAccepted.value,
      acceptedAt: new Date().toISOString()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    isVisible.value = false
  }

  onMounted(() => {
    const rawConsent = localStorage.getItem(STORAGE_KEY)

    if (!rawConsent) {
      isVisible.value = true
      return
    }

    try {
      const consent = JSON.parse(rawConsent)
      isVisible.value = consent.version !== CONSENT_VERSION
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      isVisible.value = true
    }
  })

  return {
    isVisible,
    analyticsAccepted,
    saveConsent
  }
}

import type { Ref } from 'vue'

export type RegistrationConsentModel = 'terms' | 'privacy' | 'cookies' | 'trademark' | 'copyright' | 'community'

export type RegistrationConsentModels = Record<RegistrationConsentModel, Ref<boolean>>

export const registrationConsentItems: Array<{
  model: RegistrationConsentModel
  text: string
  linkText: string
  to: string
}> = [
  {
    model: 'terms',
    text: 'Я принимаю ',
    linkText: 'Пользовательское соглашение',
    to: '/legal/terms-of-use'
  },
  {
    model: 'privacy',
    text: 'Я согласен с правилами обработки данных в ',
    linkText: 'Политике конфиденциальности',
    to: '/legal/privacy-policy'
  },
  {
    model: 'cookies',
    text: 'Я понимаю использование cookies и localStorage согласно ',
    linkText: 'Cookie Policy',
    to: '/legal/cookie-policy'
  },
  {
    model: 'trademark',
    text: 'Я ознакомлен с тем, что NBA MOM не является официальным продуктом NBA: ',
    linkText: 'Trademark Disclaimer',
    to: '/legal/trademark-disclaimer'
  },
  {
    model: 'copyright',
    text: 'Я принимаю правила использования визуального и медийного контента: ',
    linkText: 'Copyright Policy',
    to: '/legal/copyright-policy'
  },
  {
    model: 'community',
    text: 'Я обязуюсь соблюдать правила комментариев, новостей и общения: ',
    linkText: 'Политика общения',
    to: '/legal/community-policy'
  }
]

export function createRegistrationConsentModels(consents: {
  acceptedTerms: Ref<boolean>
  acceptedPrivacy: Ref<boolean>
  acceptedCookies: Ref<boolean>
  acceptedTrademark: Ref<boolean>
  acceptedCopyright: Ref<boolean>
  acceptedCommunityPolicy: Ref<boolean>
}): RegistrationConsentModels {
  return {
    terms: consents.acceptedTerms,
    privacy: consents.acceptedPrivacy,
    cookies: consents.acceptedCookies,
    trademark: consents.acceptedTrademark,
    copyright: consents.acceptedCopyright,
    community: consents.acceptedCommunityPolicy
  }
}

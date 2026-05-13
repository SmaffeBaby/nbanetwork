export type NewsArticle = {
  id: string
  author_id: string
  title: string
  slug: string
  excerpt: string
  content_html: string
  cover_image_url: string | null
  game_ids: string[]
  hashtags: string[]
  published: boolean
  created_at: string
  updated_at: string
  profiles?: {
    first_name?: string | null
    last_name?: string | null
    avatar_img?: string | null
  } | null
}

const allowedTags = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'DIV',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'H2',
  'H3',
  'H4',
  'HR',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'SPAN',
  'STRONG',
  'U',
  'UL'
])

const allowedStyles = new Set([
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-align'
])

export const normalizeHashtag = (value: string) =>
  value
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')

export const normalizeGameId = (value: string) => value.trim().replace(/[^\d]/g, '')

export const makeSlug = (title: string) => {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return `${normalized || 'news'}-${Date.now().toString(36)}`
}

export const stripHtml = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  return (container.textContent || '').replace(/\s+/g, ' ').trim()
}

export const makeExcerpt = (html: string, limit = 180) => {
  const text = stripHtml(html)
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trim()}...`
}

export const sanitizeNewsHtml = (html: string) => {
  const template = document.createElement('template')
  template.innerHTML = html

  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement

        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(...Array.from(element.childNodes))
          return
        }

        Array.from(element.attributes).forEach(attribute => {
          const name = attribute.name.toLowerCase()
          const value = attribute.value

          if (name.startsWith('on')) {
            element.removeAttribute(attribute.name)
            return
          }

          if (element.tagName === 'A' && name === 'href') {
            const safe = /^(https?:|mailto:|\/)/i.test(value)
            if (!safe) element.removeAttribute(attribute.name)
            return
          }

          if (element.tagName === 'IMG' && name === 'src') {
            const safe = /^(https?:|data:image\/|\/)/i.test(value)
            if (!safe) element.removeAttribute(attribute.name)
            return
          }

          if (name === 'style') {
            const safeStyle = value
              .split(';')
              .map(part => part.trim())
              .filter(part => {
                const [property] = part.split(':')
                return allowedStyles.has((property || '').trim().toLowerCase())
              })
              .join('; ')

            if (safeStyle) element.setAttribute('style', safeStyle)
            else element.removeAttribute(attribute.name)
            return
          }

          const safeAttribute = ['class', 'alt', 'title', 'target', 'rel'].includes(name)
          if (!safeAttribute) element.removeAttribute(attribute.name)
        })

        if (element.tagName === 'A') {
          element.setAttribute('rel', 'noopener noreferrer')
          if (!element.getAttribute('target')) element.setAttribute('target', '_blank')
        }

        walk(element)
      }
    })
  }

  walk(template.content)
  return template.innerHTML
}

export const formatNewsDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

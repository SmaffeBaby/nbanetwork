import { computed, ref, watch, type Ref } from 'vue'
import { authFetch } from '../../../../api/authFetch'
import { sanitizeNewsHtml } from '../../../../utils/news'
import type {
  TeamAboutBlock,
  TeamAboutGalleryBlock,
  TeamAboutHallOfFameBlock,
  TeamAboutHallOfFameItem,
  TeamAboutHeadingBlock,
  TeamAboutPage,
  TeamAboutParagraphBlock
} from '../../../../types/teamAbout'

const CACHE_PREFIX = 'team-about-page:'
const CACHE_TTL = 10 * 60 * 1000
const IMAGE_MAX_WIDTH = 1400
const IMAGE_MAX_HEIGHT = 1000
const IMAGE_QUALITY = 0.78
const memoryCache = new Map<string, { page: TeamAboutPage; cachedAt: number }>()

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const canvasToDataUrl = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<string>((resolve) => {
    canvas.toBlob(blob => {
      if (!blob) {
        resolve(canvas.toDataURL(type, quality))
        return
      }

      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    }, type, quality)
  })

const compressRasterImage = async (file: File) => {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return fileToDataUrl(file)
  }

  const rawUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = rawUrl
    await image.decode()

    const scale = Math.min(
      1,
      IMAGE_MAX_WIDTH / image.naturalWidth,
      IMAGE_MAX_HEIGHT / image.naturalHeight
    )
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return fileToDataUrl(file)

    context.drawImage(image, 0, 0, width, height)
    return canvasToDataUrl(canvas, 'image/webp', IMAGE_QUALITY)
  } catch {
    return fileToDataUrl(file)
  } finally {
    URL.revokeObjectURL(rawUrl)
  }
}

const createHallOfFameItem = (): TeamAboutHallOfFameItem => ({
  id: createId(),
  imageUrl: '',
  label: '',
  mvpPlayerName: '',
  mvpSeason: '',
  playerUrl: '',
  linkType: 'internal',
  breakAfter: false,
  spacingAfter: 0
})

export const createTeamAboutBlock = (type: TeamAboutBlock['type']): TeamAboutBlock => {
  if (type === 'heading') {
    return {
      id: createId(),
      type,
      text: 'Новый раздел',
      level: 2,
      collapsible: true,
      collapsedByDefault: false
    }
  }

  if (type === 'gallery') {
    return {
      id: createId(),
      type,
      title: 'Галерея',
      images: []
    }
  }

  if (type === 'hallOfFame') {
    return {
      id: createId(),
      type,
      title: 'Зал славы',
      hidden: false,
      items: [createHallOfFameItem()]
    }
  }

  return {
    id: createId(),
    type: 'paragraph',
    html: '<p>Добавьте текст о команде.</p>'
  }
}

const normalizeBlock = (block: Partial<TeamAboutBlock>): TeamAboutBlock | null => {
  if (!block?.id || !block?.type) return null

  if (block.type === 'heading') {
    const heading = block as Partial<TeamAboutHeadingBlock>
    return {
      id: String(heading.id),
      type: 'heading',
      text: String(heading.text || 'Раздел'),
      level: heading.level === 3 ? 3 : 2,
      collapsible: Boolean(heading.collapsible),
      collapsedByDefault: Boolean(heading.collapsedByDefault)
    }
  }

  if (block.type === 'gallery') {
    const gallery = block as Partial<TeamAboutGalleryBlock>
    return {
      id: String(gallery.id),
      type: 'gallery',
      title: String(gallery.title || 'Галерея'),
      images: Array.isArray(gallery.images)
        ? gallery.images
            .filter(image => image?.url)
            .map(image => ({
              id: image.id || createId(),
              url: String(image.url),
              alt: String(image.alt || '')
            }))
        : []
    }
  }

  if (block.type === 'hallOfFame') {
    const hall = block as Partial<TeamAboutHallOfFameBlock> & {
      mvp?: { playerName?: string; season?: string; imageUrl?: string }
    }
    type LegacyHallItem = Partial<TeamAboutHallOfFameItem> & { svgUrl?: string }
    const legacyItem: LegacyHallItem[] = hall.mvp?.imageUrl || hall.mvp?.playerName || hall.mvp?.season
      ? [{
          id: createId(),
          imageUrl: String(hall.mvp?.imageUrl || ''),
          label: '',
          mvpPlayerName: String(hall.mvp?.playerName || ''),
          mvpSeason: String(hall.mvp?.season || ''),
          playerUrl: '',
          linkType: 'internal',
          breakAfter: false,
          spacingAfter: 0
      }]
      : []
    const hallItems: LegacyHallItem[] = Array.isArray(hall.items)
      ? hall.items as LegacyHallItem[]
      : legacyItem

    return {
      id: String(hall.id),
      type: 'hallOfFame',
      title: String(hall.title || 'Зал славы'),
      hidden: Boolean(hall.hidden),
      items: hallItems
        .map(item => ({
          id: item.id || createId(),
          imageUrl: String(item.imageUrl || item.svgUrl || ''),
          label: String(item.label || ''),
          mvpPlayerName: String(item.mvpPlayerName || ''),
          mvpSeason: String(item.mvpSeason || ''),
          playerUrl: String(item.playerUrl || ''),
          linkType: item.linkType === 'external' ? 'external' : 'internal',
          breakAfter: Boolean(item.breakAfter),
          spacingAfter: Math.max(0, Math.min(160, Number(item.spacingAfter) || 0))
        }))
    }
  }

  const paragraph = block as Partial<TeamAboutParagraphBlock>
  return {
    id: String(paragraph.id),
    type: 'paragraph',
    html: sanitizeNewsHtml(String(paragraph.html || '<p></p>'))
  }
}

const normalizeBlocks = (blocks: unknown): TeamAboutBlock[] => {
  if (!Array.isArray(blocks)) return []

  return blocks
    .map(block => normalizeBlock(block as Partial<TeamAboutBlock>))
    .filter((block): block is TeamAboutBlock => Boolean(block))
}

const cloneBlocks = (blocks: TeamAboutBlock[]) =>
  normalizeBlocks(JSON.parse(JSON.stringify(blocks)))

const clonePage = (page: TeamAboutPage): TeamAboutPage => ({
  ...page,
  blocks: cloneBlocks(page.blocks)
})

const cacheKey = (teamAbbr: string) => `${CACHE_PREFIX}${teamAbbr}`

const readCachedPage = (teamAbbr: string) => {
  const memory = memoryCache.get(teamAbbr)
  if (memory) return memory

  try {
    const raw = sessionStorage.getItem(cacheKey(teamAbbr))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { page: TeamAboutPage; cachedAt: number }
    const page = {
      ...parsed.page,
      blocks: normalizeBlocks(parsed.page?.blocks)
    }
    const cacheEntry = { page, cachedAt: Number(parsed.cachedAt) || 0 }
    memoryCache.set(teamAbbr, cacheEntry)
    return cacheEntry
  } catch {
    sessionStorage.removeItem(cacheKey(teamAbbr))
    return null
  }
}

const writeCachedPage = (page: TeamAboutPage) => {
  const cacheEntry = {
    page: clonePage(page),
    cachedAt: Date.now()
  }

  memoryCache.set(page.team_abbr, cacheEntry)

  try {
    sessionStorage.setItem(cacheKey(page.team_abbr), JSON.stringify(cacheEntry))
  } catch {
    // Large base64 images can exceed storage quota; memory cache still helps during this session.
  }
}

const createDefaultBlocks = (teamAbbr: string): TeamAboutBlock[] => [
  {
    ...(createTeamAboutBlock('heading') as TeamAboutHeadingBlock),
    text: teamAbbr,
    collapsible: false
  },
  {
    ...(createTeamAboutBlock('paragraph') as TeamAboutParagraphBlock),
    html: `<p>${teamAbbr} пока ждет свою историю. Администратор может добавить сюда абзацы, ссылки, галерею и зал славы.</p>`
  }
]

export function useTeamAbout(teamAbbr: Ref<string>) {
  const page = ref<TeamAboutPage | null>(null)
  const draftBlocks = ref<TeamAboutBlock[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const isEditing = ref(false)

  const publishedBlocks = computed(() => page.value?.blocks ?? [])
  const hasContent = computed(() => publishedBlocks.value.length > 0)

  const load = async () => {
    const abbr = teamAbbr.value
    if (!abbr) return

    const cached = readCachedPage(abbr)
    const cacheIsFresh = cached && Date.now() - cached.cachedAt < CACHE_TTL

    if (cached) {
      page.value = clonePage(cached.page)
      draftBlocks.value = page.value.blocks.length
        ? cloneBlocks(page.value.blocks)
        : createDefaultBlocks(abbr)
    }

    if (cacheIsFresh) {
      loading.value = false
      error.value = ''
      return
    }

    loading.value = !cached
    error.value = ''

    try {
      const response = await fetch(`/api/team-about/${encodeURIComponent(abbr)}`)
      const data = await response.json()
      console.debug('team-about cache:', response.headers.get('X-Cache-Status') || 'UNKNOWN', abbr)

      if (!response.ok) throw new Error(data?.error || 'Failed to load team about page')

      page.value = data?.team_abbr
        ? {
            team_abbr: data.team_abbr,
            blocks: normalizeBlocks(data.blocks),
            published: data.published ?? true,
            updated_at: data.updated_at
          }
        : { team_abbr: abbr, blocks: [], published: true }

      writeCachedPage(page.value)
      draftBlocks.value = page.value.blocks.length
        ? cloneBlocks(page.value.blocks)
        : createDefaultBlocks(abbr)
    } catch (loadException: any) {
      error.value = loadException?.message || 'Не удалось загрузить страницу команды.'
      page.value = null
      draftBlocks.value = createDefaultBlocks(abbr)
    } finally {
      loading.value = false
    }
  }

  const startEditing = () => {
    draftBlocks.value = page.value?.blocks.length
      ? cloneBlocks(page.value.blocks)
      : createDefaultBlocks(teamAbbr.value)
    isEditing.value = true
  }

  const cancelEditing = () => {
    draftBlocks.value = page.value?.blocks ? cloneBlocks(page.value.blocks) : []
    isEditing.value = false
    error.value = ''
  }

  const addBlock = (type: TeamAboutBlock['type']) => {
    draftBlocks.value.push(createTeamAboutBlock(type))
  }

  const removeBlock = (blockId: string) => {
    draftBlocks.value = draftBlocks.value.filter(block => block.id !== blockId)
  }

  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= draftBlocks.value.length) return
    const next = [...draftBlocks.value]
    const [item] = next.splice(fromIndex, 1)
    if (!item) return
    next.splice(toIndex, 0, item)
    draftBlocks.value = next
  }

  const addGalleryImage = (block: TeamAboutGalleryBlock) => {
    block.images.push({ id: createId(), url: '', alt: '' })
  }

  const removeGalleryImage = (block: TeamAboutGalleryBlock, imageId: string) => {
    block.images = block.images.filter(image => image.id !== imageId)
  }

  const uploadGalleryImage = async (block: TeamAboutGalleryBlock, event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (!files.length) return

    const images = files.filter(file => file.type.startsWith('image/'))
    if (images.length !== files.length) {
      error.value = 'В галерею можно загружать только изображения.'
    } else {
      error.value = ''
    }

    const uploaded = await Promise.all(
      images.map(async file => ({
        id: createId(),
        url: await compressRasterImage(file),
        alt: file.name.replace(/\.[^.]+$/, '')
      }))
    )

    block.images.push(...uploaded)
    input.value = ''
  }

  const addHallOfFameItem = (block: TeamAboutHallOfFameBlock) => {
    block.items.push(createHallOfFameItem())
  }

  const removeHallOfFameItem = (block: TeamAboutHallOfFameBlock, itemId: string) => {
    block.items = block.items.filter(item => item.id !== itemId)
  }

  const moveHallOfFameItem = (block: TeamAboutHallOfFameBlock, fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= block.items.length) return
    const next = [...block.items]
    const [item] = next.splice(fromIndex, 1)
    if (!item) return
    next.splice(toIndex, 0, item)
    block.items = next
  }

  const uploadHallOfFameImage = async (item: TeamAboutHallOfFameItem, event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')

    if (!isSvg && !isPng) {
      error.value = 'Можно загрузить только SVG или PNG.'
      input.value = ''
      return
    }

    error.value = ''
    item.imageUrl = isSvg
      ? await fileToDataUrl(file)
      : await compressRasterImage(file)
    input.value = ''
  }

  const save = async () => {
    const abbr = teamAbbr.value
    if (!abbr || saving.value) return

    saving.value = true
    error.value = ''

    try {
      const blocks = normalizeBlocks(draftBlocks.value)
      const data = await authFetch(`/api/team-about/${encodeURIComponent(abbr)}`, {
        method: 'PUT',
        body: JSON.stringify({
          blocks,
          published: true
        })
      })

      page.value = {
        team_abbr: data.team_abbr,
        blocks: normalizeBlocks(data.blocks),
        published: data.published ?? true,
        updated_at: data.updated_at
      }
      writeCachedPage(page.value)
      draftBlocks.value = cloneBlocks(page.value.blocks)
      isEditing.value = false
    } catch (saveException: any) {
      error.value = saveException?.message || 'Не удалось сохранить страницу команды.'
    } finally {
      saving.value = false
    }
  }

  watch(teamAbbr, () => {
    isEditing.value = false
    void load()
  }, { immediate: true })

  return {
    page,
    draftBlocks,
    publishedBlocks,
    hasContent,
    loading,
    saving,
    error,
    isEditing,
    load,
    startEditing,
    cancelEditing,
    addBlock,
    removeBlock,
    moveBlock,
    addGalleryImage,
    removeGalleryImage,
    uploadGalleryImage,
    addHallOfFameItem,
    removeHallOfFameItem,
    moveHallOfFameItem,
    uploadHallOfFameImage,
    save
  }
}

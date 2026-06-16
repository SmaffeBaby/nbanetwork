import { computed, ref, watch, type Ref } from 'vue'
import { supabase } from '../../../../lib/supabase'
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

const TABLE = 'team_about_pages'

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

    loading.value = true
    error.value = ''

    try {
      const { data, error: loadError } = await supabase
        .from(TABLE)
        .select('team_abbr, blocks, published, updated_at')
        .eq('team_abbr', abbr)
        .maybeSingle()

      if (loadError) throw loadError

      page.value = data
        ? {
            team_abbr: data.team_abbr,
            blocks: normalizeBlocks(data.blocks),
            published: data.published ?? true,
            updated_at: data.updated_at
          }
        : {
            team_abbr: abbr,
            blocks: [],
            published: true
          }

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
        url: await fileToDataUrl(file),
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
    item.imageUrl = await fileToDataUrl(file)
    input.value = ''
  }

  const save = async () => {
    const abbr = teamAbbr.value
    if (!abbr || saving.value) return

    saving.value = true
    error.value = ''

    try {
      await supabase.auth.getSession()
      const blocks = normalizeBlocks(draftBlocks.value)
      const { data, error: saveError } = await supabase
        .from(TABLE)
        .upsert({
          team_abbr: abbr,
          blocks,
          published: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'team_abbr' })
        .select('team_abbr, blocks, published, updated_at')
        .single()

      if (saveError) throw saveError

      page.value = {
        team_abbr: data.team_abbr,
        blocks: normalizeBlocks(data.blocks),
        published: data.published ?? true,
        updated_at: data.updated_at
      }
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

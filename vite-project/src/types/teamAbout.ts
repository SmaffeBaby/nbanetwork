export type TeamAboutBlockType = 'paragraph' | 'heading' | 'gallery' | 'hallOfFame'

export type TeamAboutParagraphBlock = {
  id: string
  type: 'paragraph'
  html: string
}

export type TeamAboutHeadingBlock = {
  id: string
  type: 'heading'
  text: string
  level: 2 | 3
  collapsible: boolean
  collapsedByDefault: boolean
}

export type TeamAboutGalleryImage = {
  id: string
  url: string
  alt: string
}

export type TeamAboutGalleryBlock = {
  id: string
  type: 'gallery'
  title: string
  images: TeamAboutGalleryImage[]
}

export type TeamAboutHallOfFameBlock = {
  id: string
  type: 'hallOfFame'
  title: string
  hidden: boolean
  items: TeamAboutHallOfFameItem[]
}

export type TeamAboutHallOfFameItem = {
  id: string
  imageUrl: string
  label: string
  mvpPlayerName: string
  mvpSeason: string
  playerUrl: string
  linkType: 'internal' | 'external'
  breakAfter: boolean
  spacingAfter: number
}

export type TeamAboutBlock =
  | TeamAboutParagraphBlock
  | TeamAboutHeadingBlock
  | TeamAboutGalleryBlock
  | TeamAboutHallOfFameBlock

export type TeamAboutPage = {
  team_abbr: string
  blocks: TeamAboutBlock[]
  published: boolean
  updated_at?: string
}

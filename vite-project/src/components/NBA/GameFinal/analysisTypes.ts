export type AnalysisArticle = {
  title: string; deck: string; dateUTC: string; hasPlayByPlay: boolean
  sections: { id: string; title: string; paragraphs: string[] }[]
  source: { name: string; url: string }
}
export type RelatedMatch = {
  id: string; datetime: string; status: string; period: number
  home_team: { id: string | number; abbreviation: string; full_name: string }
  visitor_team: { id: string | number; abbreviation: string; full_name: string }
  home_team_score: number | null; visitor_team_score: number | null
}
export type RelatedMatches = {
  date: string
  recent: { team: { id: string; abbr: string; name: string }; games: RelatedMatch[]; error?: string }[]
  sameDay: { games: RelatedMatch[]; error?: string }
}

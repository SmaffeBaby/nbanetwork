type AgeBio = { birthDate?: string; active?: boolean | null; deathDate?: string | null; careerEndDate?: string | null }

function ageAt(birth: string, reference: string) {
  const start = new Date(`${birth.slice(0,10)}T00:00:00Z`), end = new Date(`${reference.slice(0,10)}T00:00:00Z`)
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end < start) return null
  return end.getUTCFullYear() - start.getUTCFullYear() - Number(end.getUTCMonth() < start.getUTCMonth() || end.getUTCMonth() === start.getUTCMonth() && end.getUTCDate() < start.getUTCDate())
}
const years = (age: number) => `${age} ${age % 10 === 1 && age % 100 !== 11 ? 'год' : age % 10 >= 2 && age % 10 <= 4 && (age % 100 < 12 || age % 100 > 14) ? 'года' : 'лет'}`

export function playerAgeLabel(bio: AgeBio | null, now = new Date()): string | null {
  if (!bio?.birthDate) return null
  if (bio.active === true && !bio.deathDate) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const age = ageAt(bio.birthDate, today)
    return age === null ? null : years(age)
  }
  if (bio.active !== false && !bio.deathDate || !bio.careerEndDate || bio.deathDate && bio.careerEndDate.slice(0,10) > bio.deathDate.slice(0,10)) return null
  const age = ageAt(bio.birthDate, bio.careerEndDate)
  return age === null ? null : `Завершил выступления в НБА в ${years(age)}`
}

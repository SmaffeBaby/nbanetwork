const english = new Intl.DisplayNames(['en'],{type:'region',fallback:'none'})
const russian = new Intl.DisplayNames(['ru'],{type:'region',fallback:'none'})
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-zа-я0-9]/g,'')
const aliases: Record<string,string> = {
  usa:'US',unitedstatesofamerica:'US',usvirginislands:'VI',czechrepublic:'CZ',
  turkey:'TR',southkorea:'KR',democraticrepublicofthecongo:'CD',republicofthecongo:'CG',
  england:'GB',scotland:'GB',greatbritain:'GB',serbiaandmontenegro:'RS'
}
let regions: Map<string,string> | undefined

export function playerCountry(value: string) {
  if (!value) return {name:'',flag:''}
  if (!regions) {
    regions = new Map()
    for (let first=65; first<=90; first++) {
      for (let second=65; second<=90; second++) {
        const code = String.fromCharCode(first,second)
        for (const formatter of [english,russian]) {
          const name = formatter.of(code)
          if (name) regions.set(normalize(name),code)
        }
      }
    }
  }
  const key = normalize(value)
  const code = aliases[key] || regions.get(key) || (/^[A-Z]{2}$/.test(value) && english.of(value) ? value : '')
  return {
    name:code ? russian.of(code) || value : value,
    flag:code ? String.fromCodePoint(...[...code].map(char=>127397+char.charCodeAt(0))) : ''
  }
}

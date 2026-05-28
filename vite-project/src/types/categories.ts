export type CategoryValue = string

export type CategoryOption<TValue extends CategoryValue = CategoryValue> = {
  value: TValue
  label: string
  badge?: number | string
  dividerBefore?: boolean
}

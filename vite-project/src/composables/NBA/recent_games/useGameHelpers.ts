import { ref, nextTick } from 'vue'
import Datepicker from 'vue3-datepicker'

export const datepickerRef = ref<InstanceType<typeof Datepicker> | null>(null)


export const openCalendar = async () => {
    await nextTick()
    const inputEl = datepickerRef.value?.$el.querySelector('input') as HTMLInputElement
    if (inputEl) inputEl.focus() // фокус открывает календарь
}

export const formatDateWithWeekday = (date: Date | null) => {
    if (!date) return ''
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }
    const formatted = new Intl.DateTimeFormat('ru-RU', options).format(date)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
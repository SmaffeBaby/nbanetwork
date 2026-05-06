export const MSK_TIMEZONE = 'Europe/Moscow'

export const formatGameTime = (iso: string, timeZone = MSK_TIMEZONE) => {
    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    }).format(new Date(iso))
}

export const toMSK = (date: Date) => {
    return new Date(date.toLocaleString('en-US', { timeZone: MSK_TIMEZONE }))
}

export const getDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export const getWeekday = (date: Date) => {
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
    return weekdays[date.getDay()]
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
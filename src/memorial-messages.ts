import memorialMessages from './assets/memorial_messages.json'

export type MemorialMessage = {
    username: string
    usernameColor: string | null
    content: string
    postedAt: string
    usernameUrl: string
}

export const messages = memorialMessages as MemorialMessage[]

/** "04-08-2026 17:07" -> "04.08.26" */
export function formatPostedAt(postedAt: string) {
    const [day, month, year] = postedAt.split(' ')[0].split('-')
    return `${day}.${month}.${year?.slice(2)}`
}

/** "04-08-2026 17:07" (DD-MM-YYYY) -> a local Date. */
export function parsePostedAt(postedAt: string) {
    const [date, time = '00:00'] = postedAt.split(' ')
    const [day, month, year] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)
    return new Date(year, month - 1, day, hours, minutes)
}

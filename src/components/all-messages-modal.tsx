import { useEffect, useMemo, useRef, useState } from 'react'
import { formatPostedAt, messages, parsePostedAt, type MemorialMessage } from '../memorial-messages'

/** Messages paired with their parsed date, so filtering never re-parses. */
const dated = messages.map((message, id) => ({ id, message, date: parsePostedAt(message.postedAt) }))

/** "YYYY-MM-DD" bounds of the data, used to limit the date pickers. */
const dateBounds = (() => {
    const times = dated.map(({ date }) => date.getTime())
    return {
        min: toDateInputValue(new Date(Math.min(...times))),
        max: toDateInputValue(new Date(Math.max(...times))),
    }
})()

/** Content longer than this is collapsed behind a "read more" toggle. */
const COLLAPSE_THRESHOLD = 220

const SORT_OPTIONS = [
    { value: 'date-desc', label: 'החדשות ביותר' },
    { value: 'date-asc', label: 'הישנות ביותר' },
    { value: 'name-asc', label: 'שם משתמש: א-ת' },
    { value: 'name-desc', label: 'שם משתמש: ת-א' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['value']

/** Usernames mix Hebrew, Latin and punctuation, so let the locale decide. */
const collator = new Intl.Collator('he', { sensitivity: 'base', numeric: true })

type DatedMessage = (typeof dated)[number]

const comparators: Record<SortKey, (a: DatedMessage, b: DatedMessage) => number> = {
    'date-desc': (a, b) => b.date.getTime() - a.date.getTime(),
    'date-asc': (a, b) => a.date.getTime() - b.date.getTime(),
    // Same author's messages stay newest-first within their group.
    'name-asc': (a, b) =>
        collator.compare(a.message.username, b.message.username) || b.date.getTime() - a.date.getTime(),
    'name-desc': (a, b) =>
        collator.compare(b.message.username, a.message.username) || b.date.getTime() - a.date.getTime(),
}

/** Shared look for the date pickers and the sort select. */
const fieldClassName =
    'w-full cursor-pointer rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-400/20'

function toDateInputValue(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** "YYYY-MM-DD" -> local Date at the start or the very end of that day. */
function parseDateInput(value: string, edge: 'start' | 'end') {
    if (!value) return null
    const [year, month, day] = value.split('-').map(Number)
    return edge === 'start'
        ? new Date(year, month - 1, day, 0, 0, 0, 0)
        : new Date(year, month - 1, day, 23, 59, 59, 999)
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function AllMessagesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const [query, setQuery] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [sort, setSort] = useState<SortKey>('date-desc')
    const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())

    // <dialog> handles Escape, focus trapping and the top layer for us.
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return

        if (open && !dialog.open) {
            dialog.showModal()
            // Desktop only: on mobile the keyboard would cover half the results.
            if (window.matchMedia('(min-width: 640px)').matches) searchRef.current?.focus()
        } else if (!open && dialog.open) {
            dialog.close()
        }
    }, [open])

    const results = useMemo(() => {
        const needle = query.trim().toLowerCase()
        const from = parseDateInput(fromDate, 'start')
        const to = parseDateInput(toDate, 'end')

        return dated
            .filter(({ message, date }) => {
                if (from && date < from) return false
                if (to && date > to) return false
                if (!needle) return true
                return (
                    message.username.toLowerCase().includes(needle) ||
                    message.content.toLowerCase().includes(needle)
                )
            })
            .sort(comparators[sort])
    }, [query, fromDate, toDate, sort])

    const hasFilters = Boolean(query || fromDate || toDate)

    const clearFilters = () => {
        setQuery('')
        setFromDate('')
        setToDate('')
        searchRef.current?.focus()
    }

    const toggleExpanded = (index: number) => {
        setExpanded(current => {
            const next = new Set(current)
            if (!next.delete(index)) next.add(index)
            return next
        })
    }

    return (
        <dialog
            ref={dialogRef}
            dir="rtl"
            onClose={onClose}
            onClick={event => {
                if (event.target === dialogRef.current) onClose()
            }}
            className="m-0 h-dvh max-h-none w-full max-w-none bg-zinc-50 p-0 shadow-xl backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[85vh] sm:w-[min(44rem,92vw)] sm:rounded-2xl"
        >
            <div className="flex h-full max-h-dvh flex-col sm:max-h-[85vh]">
                <div className="shrink-0 border-b border-black/10 bg-white px-4 py-3 sm:rounded-t-2xl">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-bold sm:text-lg">כל ההקדשות</h2>
                        <button
                            type="button"
                            aria-label="סגירה"
                            onClick={onClose}
                            className="-ml-1 cursor-pointer rounded-lg p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                        <div className="relative">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-black/35"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                            </svg>
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder="חיפוש לפי שם משתמש או תוכן ההקדשה"
                                aria-label="חיפוש לפי שם משתמש או תוכן ההקדשה"
                                className="w-full rounded-lg border border-black/10 bg-white py-2 pr-9 pl-9 text-sm outline-none placeholder:text-black/35 focus:border-red-400/60 focus:ring-2 focus:ring-red-400/20"
                            />
                            {query && (
                                <button
                                    type="button"
                                    aria-label="ניקוי החיפוש"
                                    onClick={() => {
                                        setQuery('')
                                        searchRef.current?.focus()
                                    }}
                                    className="absolute inset-y-0 left-2 my-auto flex size-6 cursor-pointer items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <DateField
                                label="מתאריך"
                                value={fromDate}
                                min={dateBounds.min}
                                max={toDate || dateBounds.max}
                                onChange={setFromDate}
                            />
                            <DateField
                                label="עד תאריך"
                                value={toDate}
                                min={fromDate || dateBounds.min}
                                max={dateBounds.max}
                                onChange={setToDate}
                            />
                            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                                <span className="text-[11px] font-medium text-black/50">מיון</span>
                                <select
                                    value={sort}
                                    onChange={event => setSort(event.target.value as SortKey)}
                                    className={fieldClassName}
                                >
                                    {SORT_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-black/50">
                            <span>
                                {results.length === messages.length
                                    ? `${messages.length} הקדשות`
                                    : `נמצאו ${results.length} מתוך ${messages.length} הקדשות`}
                            </span>
                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="cursor-pointer rounded-md px-2 py-1 font-medium text-red-600/80 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                    ניקוי סינון
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
                    {results.length === 0 ? (
                        <p className="px-2 py-12 text-center text-sm text-black/45">
                            לא נמצאו הקדשות התואמות לחיפוש
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {results.map(({ id, message }) => (
                                <MessageCard
                                    key={id}
                                    message={message}
                                    query={query.trim()}
                                    expanded={expanded.has(id)}
                                    onToggle={() => toggleExpanded(id)}
                                    index={id}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </dialog>
    )
}

function DateField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string
    value: string
    min: string
    max: string
    onChange: (value: string) => void
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-black/50">{label}</span>
            <input
                type="date"
                value={value}
                min={min}
                max={max}
                onChange={event => onChange(event.target.value)}
                className={fieldClassName}
            />
        </label>
    )
}

function MessageCard({
    message,
    query,
    expanded,
    onToggle,
    index,
}: {
    message: MemorialMessage
    query: string
    expanded: boolean
    onToggle: () => void
    index: number
}) {
    const isLong = message.content.length > COLLAPSE_THRESHOLD

    return (
        <li className="rounded-xl border border-black/10 bg-white/70 px-3.5 py-3 shadow-sm transition-colors hover:bg-white">
            <div className="flex items-baseline justify-between gap-2">
                <a
                    href={message.usernameUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-bold hover:underline"
                    style={message.usernameColor ? { color: message.usernameColor } : undefined}
                >
                    <Highlight text={message.username} query={query} /> <span className="text-zinc-400 font-normal">#{index + 1}</span>
                </a>
                <time className="shrink-0 text-[11px] text-black/45">{formatPostedAt(message.postedAt)}</time>
            </div>

            <p
                className={`mt-1 text-sm leading-relaxed whitespace-pre-line ${isLong && !expanded ? 'line-clamp-4' : ''}`}
            >
                <Highlight text={message.content} query={query} />
            </p>

            {isLong && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="mt-1 cursor-pointer text-xs font-medium text-red-600/80 transition-colors hover:text-red-600"
                >
                    {expanded ? 'הצגה מקוצרת' : 'קריאת ההקדשה המלאה'}
                </button>
            )}
        </li>
    )
}

function Highlight({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>

    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
    const needle = query.toLowerCase()

    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === needle ? (
                    <mark key={index} className="rounded bg-amber-200/70 text-inherit">
                        {part}
                    </mark>
                ) : (
                    part
                ),
            )}
        </>
    )
}

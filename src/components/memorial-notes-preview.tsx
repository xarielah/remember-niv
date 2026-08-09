import { useCallback, useEffect, useRef, useState } from 'react'
import { formatPostedAt, messages, type MemorialMessage } from '../memorial-messages'

/** Full time a message stays on screen, fade included. */
const CYCLE_MS = 10_000
const FADE_MS = 400

export default function MemorialNotesPreview() {
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    // Bumped on every message change, manual or automatic: restarts both the
    // countdown to the next message and the progress bar animation.
    const [cycle, setCycle] = useState(0)
    const fadeTimeout = useRef<number | undefined>(undefined)

    const step = useCallback((delta: number) => {
        setVisible(false)
        setCycle(current => current + 1)
        clearTimeout(fadeTimeout.current)
        fadeTimeout.current = window.setTimeout(() => {
            setIndex(current => (current + delta + messages.length) % messages.length)
            setVisible(true)
        }, FADE_MS)
    }, [])

    const closeModal = useCallback(() => {
        setIsModalOpen(false)
        // Give the message a fresh cycle instead of resuming a stale countdown.
        setCycle(current => current + 1)
    }, [])

    useEffect(() => {
        // The carousel holds still while the message is being read in the modal.
        if (messages.length <= 1 || isModalOpen) return

        const next = setTimeout(() => step(1), CYCLE_MS - FADE_MS)
        return () => clearTimeout(next)
    }, [cycle, isModalOpen, step])

    useEffect(() => () => clearTimeout(fadeTimeout.current), [])

    const message = messages[index]
    if (!message) return null

    return (
        <div
            dir="rtl"
            className="relative w-full min-h-16 h-auto max-h-92 md:max-w-105 overflow-hidden rounded-lg border border-black/10 bg-white/60 shadow-sm"
        >
            <NavButton side="right" label="ההודעה הקודמת" onClick={() => step(-1)} />
            <NavButton side="left" label="ההודעה הבאה" onClick={() => step(1)} />

            <div
                className={`flex h-full flex-col px-5 py-2 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="flex items-baseline justify-between gap-1">
                    <a
                        href={message.usernameUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-[10px] font-bold hover:underline"
                        style={message.usernameColor ? { color: message.usernameColor } : undefined}
                    >
                        {message.username} <span className="text-zinc-400 font-normal">#{index + 1}</span>
                    </a>
                    <time className="shrink-0 text-[9px] text-black/50">{formatPostedAt(message.postedAt)}</time>
                </div>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    title="לחצו לקריאת ההודעה המלאה"
                    className="cursor-pointer text-right text-[11px] leading-tight hover:underline"
                >
                    {message.content.replace(/\s+/g, ' ').trim()}
                </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/5">
                <div
                    key={cycle}
                    className="h-full origin-right bg-red-500/70"
                    style={{
                        animation: `memorial-progress ${CYCLE_MS}ms linear forwards`,
                        animationPlayState: isModalOpen ? 'paused' : 'running',
                    }}
                />
            </div>

            <MessageModal message={message} open={isModalOpen} onClose={closeModal} />
        </div>
    )
}

function NavButton({ side, label, onClick }: { side: 'right' | 'left'; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={`absolute inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} z-10 flex w-5 items-center justify-center text-black/30 transition-colors hover:text-black/70`}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-3">
                <path d={side === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    )
}

function MessageModal({
    message,
    open,
    onClose,
}: {
    message: MemorialMessage
    open: boolean
    onClose: () => void
}) {
    const dialogRef = useRef<HTMLDialogElement>(null)

    // <dialog> handles Escape, focus trapping and the top layer for us.
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return

        if (open && !dialog.open) dialog.showModal()
        else if (!open && dialog.open) dialog.close()
    }, [open])

    return (
        <dialog
            ref={dialogRef}
            dir="rtl"
            onClose={onClose}
            onClick={event => {
                if (event.target === dialogRef.current) onClose()
            }}
            className="m-auto w-[min(32rem,90vw)] rounded-xl p-0 shadow-xl backdrop:bg-black/50"
        >
            <div className="flex max-h-[80vh] flex-col">
                <div className="flex items-baseline justify-between gap-2 border-b border-black/10 px-4 py-3">
                    <a
                        href={message.usernameUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-bold hover:underline"
                        style={message.usernameColor ? { color: message.usernameColor } : undefined}
                    >
                        {message.username}
                    </a>
                    <time className="shrink-0 text-xs text-black/50">{message.postedAt}</time>
                </div>

                <p className="overflow-y-auto px-4 py-4 leading-relaxed whitespace-pre-line">{message.content}</p>

                <div className="border-t border-black/10 px-4 py-3 text-left">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg bg-black/5 px-4 py-1.5 text-sm transition-colors hover:bg-black/10"
                    >
                        סגירה
                    </button>
                </div>
            </div>
        </dialog>
    )
}

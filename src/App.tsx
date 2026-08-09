import { useState } from 'react'
import AllMessagesModal from './components/all-messages-modal'
import Avatar from './components/avatar'
import FxpHeart from './components/fxp-heart'
import MemorialNotesPreview from './components/memorial-notes-preview'

function App() {
  const [isAllMessagesOpen, setIsAllMessagesOpen] = useState(false)

  return (
    <>
      <header>

      </header>
      <main className="flex flex-col items-center justify-center min-h-screen md:p-24 p-6 sm:p-12 gap-4 w-full">
        <Avatar />
        <p className="text-center font-bold text-2xl">בן, אח, חבר יקר - יהי זכרך ברוך <FxpHeart /></p>
        <MemorialNotesPreview />
        <button
          type="button"
          dir="rtl"
          onClick={() => setIsAllMessagesOpen(true)}
          className="cursor-pointer rounded-lg border border-black/10 bg-white/60 px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-white"
        >
          לצפייה בכל ההקדשות
        </button>
        <AllMessagesModal open={isAllMessagesOpen} onClose={() => setIsAllMessagesOpen(false)} />
      </main>
      <footer>

      </footer>
    </>
  )
}

export default App

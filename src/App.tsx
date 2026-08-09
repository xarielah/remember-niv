import { useState } from 'react'
import AllMessagesModal from './components/all-messages-modal'
import Avatar from './components/avatar'
import FxpHeart from './components/fxp-heart'
import MemorialNotesPreview from './components/memorial-notes-preview'

function App() {
  const [isAllMessagesOpen, setIsAllMessagesOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen items-center justify-between">
      <div className="flex flex-col items-center flex-1 justify-center md:p-24 p-6 sm:p-12 gap-4 w-full">
        <header>
          <Avatar />
        </header>
        <main className="gap-4 flex flex-col items-center justify-center">
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
      </div>
      <footer className="text-center p-4 w-full">
        <p className="text-sm">פותח לזכרו של ניב ע"י <a href="https://www.fxp.co.il/member.php?u=749522" target="_blank" rel="noopener noreferrer" style={{ color: '#ff8600' }}>Middleware</a></p>
      </footer>
    </div>
  )
}

export default App

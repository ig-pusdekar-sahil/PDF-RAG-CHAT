import { useState, useEffect } from 'react'
import UploadPanel from './components/UploadPanel'
import QueryPanel from './components/QueryPanel'
import {api} from './api' 

function App() {
  const [isAppReady, setIsAppReady] = useState(false)
  const [loadingText, setLoadingText] = useState("Waking up server...")

  useEffect(() => {
    let isMounted = true
    let attempts = 0

    const checkServerHealth = async () => {
      try {
        attempts++
        if (attempts > 5) {
          setLoadingText("Render server cold start in progress (~30s)...")
        }

        const response = await api.get("/api/health")

        if (response.status === 200 && isMounted) {
          setIsAppReady(true)
        }
      } catch (err) {
        if (isMounted) {
          setTimeout(checkServerHealth, 2000)
        }
      }
    }

    checkServerHealth()

    return () => {
      isMounted = false
    }
  }, [])

  // Initial Loading Screen
  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <div className="h-8 w-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Connecting to Backend</h2>
            <p className="text-xs text-slate-500 mt-1">{loadingText}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                RAG Assistant
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200">
                Demo
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Upload PDFs and ask questions about their content
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Ready</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <UploadPanel />
        <QueryPanel />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-4 text-center">
        <p className="text-xs text-slate-400">
          AI can make mistakes. Verify important information.
        </p>
      </footer>
    </div>
  )
}

export default App
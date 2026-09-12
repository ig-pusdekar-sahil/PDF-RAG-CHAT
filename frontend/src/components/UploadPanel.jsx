import { useRef, useState } from 'react'
import { uploadPdf } from '../api'

function UploadPanel() {
  const inputRef = useRef(null)
  const [status, setStatus] = useState(null) // { type: 'loading' | 'success' | 'error', message }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus({ type: 'loading', message: `Indexing ${file.name}… It may take some time.` })
    try {
      const result = await uploadPdf(file)
      setStatus({
        type: 'success',
        message: `Added ${result.chunks_added} chunks from ${result.filename} (${result.pages} pages)`,
      })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Upload a PDF</h2>
      <p className="mt-1 text-sm text-slate-500">
        The document is chunked, embedded, and added to the knowledge base.
      </p>

      <label
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50 ${
          status?.type === 'loading' ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        <span className="text-sm font-medium text-slate-600">
          Click to choose a PDF file
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={status?.type === 'loading'}
        />
      </label>

      {status && (
        <p
          className={`mt-3 text-sm ${
            status.type === 'error'
              ? 'text-red-600'
              : status.type === 'success'
                ? 'text-emerald-600'
                : 'text-slate-500'
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  )
}

export default UploadPanel

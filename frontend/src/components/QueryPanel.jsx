import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { askQuestion } from '../api'
import remarkGfm from 'remark-gfm'

function QueryPanel() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    setAnswer(null)
    setSource(null)

    try {
      const result = await askQuestion(trimmed)
      setAnswer(result.answer)
      setSource(result.source || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Ask a question</h2>
      <p className="mt-1 text-sm text-slate-500">
        Answers are grounded in your uploaded documents.
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="e.g. What is Pure Psychology?"
          className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="mt-3 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {answer && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Answer</h3>
          
          {/* Render Markdown Response */}
          <div className="prose prose-slate max-w-none mt-2 text-sm leading-relaxed text-slate-800">
            <ReactMarkdown rehypePlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>

          {/* Single Top Source Display */}
          {source && (
            <div className="mt-4 border-t border-slate-200 pt-3 flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold uppercase tracking-wider text-slate-500">
                Top Source:
              </span>
              <span className="font-medium text-slate-800">{source.filename}</span>
              {source.page !== undefined && source.page !== null && (
                <span className="text-slate-500">(Page {Number(source.page)})</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QueryPanel
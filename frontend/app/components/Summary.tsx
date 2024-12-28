import { Summary as SummaryType } from '@/lib/types'

interface SummaryProps {
  summary: SummaryType | null
}

export default function Summary({ summary }: SummaryProps) {
  return (
    <div className="bg-black border border-zinc-800 shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Article Summary</h2>
      <div className="text-zinc-400">
        {summary ? (
          <div className="space-y-4">
            <h3 className="text-xl text-white"></h3>
            <p>{summary.summary}</p>
          </div>
        ) : (
          <p>The summarized content of the article will appear here once the analysis is complete.</p>
        )}
      </div>
    </div>
  )
}


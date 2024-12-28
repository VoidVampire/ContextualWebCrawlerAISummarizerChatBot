interface InputSectionProps {
  url: string
  setUrl: (url: string) => void
  onAnalyze: () => void
  isAnalyzing: boolean
}

export default function InputSection({ url, setUrl, onAnalyze, isAnalyzing }: InputSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col items-center">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter an article URL..."
          className="w-full max-w-2xl px-4 py-2 text-white bg-black border border-zinc-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:border-transparent"
          required
        />
        <button
          onClick={onAnalyze}
          className="mt-4 px-6 py-2 text-black bg-[#2DD4BF] rounded-md hover:bg-[#2DD4BF]/90 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:ring-opacity-50 disabled:opacity-50"
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Article'}
        </button>
      </div>
    </div>
  )
}


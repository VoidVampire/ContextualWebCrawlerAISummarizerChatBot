interface ProgressBarProps {
  progress: number
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const stages = ['Summarizing', 'Generating Keywords', 'Crawling Related Links']
  const currentStage = Math.floor((progress / 100) * 3)

  return (
    <div className="mt-6 w-full max-w-2xl mx-auto">
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
              {stages[currentStage]}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-blue-600">
              {progress}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ease-in-out"
          ></div>
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        {stages.map((stage, index) => (
          <div
            key={stage}
            className={`${
              index <= currentStage ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            {stage}
          </div>
        ))}
      </div>
    </div>
  )
}


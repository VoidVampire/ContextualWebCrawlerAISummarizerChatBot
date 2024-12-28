import { RelatedArticle } from '@/lib/types'

interface RelatedLinksProps {
  articles: RelatedArticle[]
}

export default function RelatedLinks({ articles }: RelatedLinksProps) {
  return (
    <div className="bg-black border border-zinc-800 shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Related Articles</h2>
      <div className="max-h-64 overflow-y-auto">
        {articles.length > 0 ? (
          <ul className="space-y-2">
            {articles.map((article) => (
              <li key={article.url}>
                <a
                  href={article.url}
                  className="text-[#2DD4BF] hover:text-[#2DD4BF]/80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {article.url}
                </a>
                
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-400">Related articles will appear here once the analysis is complete.</p>
        )}
      </div>
    </div>
  )
}


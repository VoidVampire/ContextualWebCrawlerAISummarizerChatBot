'use client'
import { useState } from "react";
import Header from "../components/Header";
import InputSection from "./components/InputSection";
import Summary from "./components/Summary";
import RelatedLinks from "./components/RelatedLinks";
import Chatbot from "./components/Chatbot";
import { Summary as SummaryType, RelatedArticle } from "@/lib/types";
import { processURL } from "@/lib/api";

export default function Home() {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;

    setIsAnalyzing(true);
    setError(null);
    setSummary(null);
    setRelatedArticles([]);
    setIsAnalysisComplete(false);

    try {
      await processURL(url, (type, data) => {
        if (type === "summarization") {
          setSummary(data);
        } else if (type === "crawling") {
          setRelatedArticles(data); // Append to existing articles
        }
      });

      setIsAnalysisComplete(true);
    } catch (error) {
      console.error("Error analyzing article:", error);
      setError("Failed to analyze the article. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black dark">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <InputSection
          url={url}
          setUrl={setUrl}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 space-y-8">
            <Summary summary={summary} />
            <RelatedLinks articles={relatedArticles} />
          </div>
          <div className="w-full md:w-1/2 md:sticky md:top-8 self-start">
            <Chatbot isEnabled={isAnalysisComplete} />
          </div>
        </div>
      </main>
    </div>
  )
}

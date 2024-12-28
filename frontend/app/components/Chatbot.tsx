'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '@/lib/types'
import { resetChatHistory } from '@/lib/api'
interface ChatbotProps {
  isEnabled: boolean
}

export default function Chatbot({ isEnabled }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socket = useRef<WebSocket | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  useEffect(() => {
    if (isEnabled) {
      socket.current = new WebSocket('ws://localhost:5000/chat') // Adjust URL as needed

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.response) {
          setMessages((prev) => [...prev, { text: data.response, isUser: false }])
        } else if (data.error) {
          setMessages((prev) => [...prev, { text: `Error: ${data.error}`, isUser: false }])
        }
        setLoading(false)
      }

      socket.current.onclose = () => console.log("WebSocket closed.")
    }

    return () => {
      socket.current?.close()
    }
  }, [isEnabled])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && isEnabled && socket.current) {
      const userMessage = input.trim()
      setInput('')
      setLoading(true)
      setMessages((prev) => [...prev, { text: userMessage, isUser: true }])

      socket.current.send(JSON.stringify({ message: userMessage }))
    }
  }

  

  return (
    <div className="bg-black border border-zinc-800 shadow rounded-lg p-6 h-[calc(100vh-16rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-white">Ask the AI</h2>
        {/* <button
          onClick={handleReset}
          className="px-3 py-1 text-sm text-black bg-[#2DD4BF] rounded-md hover:bg-[#2DD4BF]/90 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:ring-opacity-50 disabled:opacity-50"
          disabled={!isEnabled}
        >
          Reset Chat
        </button> */}
      </div>
      <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${
              message.isUser ? 'text-right' : 'text-left'
            }`}
          >
            <span
              className={`inline-block p-2 rounded-lg ${
                message.isUser
                  ? 'bg-[#2DD4BF] text-black'
                  : 'bg-zinc-800 text-white'
              }`}
            >
              {message.text}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="inline-block p-2 rounded-lg bg-zinc-800 text-white">
              Thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isEnabled ? "Ask a question..." : "Please analyze an article first"}
          className="flex-grow px-4 py-2 text-white bg-black border border-zinc-800 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:border-transparent"
          disabled={!isEnabled || loading}
        />
        <button
          type="submit"
          className="px-4 py-2 text-black bg-[#2DD4BF] rounded-r-md hover:bg-[#2DD4BF]/90 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:ring-opacity-50 disabled:opacity-50"
          disabled={!isEnabled || loading}
        >
          Send
        </button>
      </form>
    </div>
  )
}

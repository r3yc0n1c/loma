'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const availableModels = ['llama3.2', 'qwen2.5-coder', 'mistral']

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('llama3.2')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim()) return

    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMessage = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMessage])

    const res = await fetch('/api/ollama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input, model }),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let done = false
    let firstChunkReceived = false

    while (!done) {
      const { value, done: readerDone } = await reader!.read()
      done = readerDone
      const chunk = decoder.decode(value)

      // Set loading to false as soon as the first chunk is received
      if (!firstChunkReceived) {
        setLoading(false)
        firstChunkReceived = true
      }

      // Split the chunk into lines and parse each line as JSON
      const lines = chunk.split('\n').filter((line) => line.trim() !== '')
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line)
          if (parsed.response) {
            assistantMessage.content += parsed.response
            setMessages([...newMessages, { ...assistantMessage }])
          }
        } catch (err) {
          console.error('Failed to parse chunk:', line, err)
        }
      }
    }
  }

  return (
    <div className="h-screen flex flex-col max-w-2xl mx-auto p-4 space-y-4">
      {/* Model Selector */}
      <div className="flex justify-between">
        <Select value={model} onValueChange={(value) => setModel(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Avatar>
          <AvatarImage src="logo.png" />
          <AvatarFallback>LM</AvatarFallback>
        </Avatar>

      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto space-y-2 border p-4 rounded">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded-md whitespace-pre-line ${msg.role === 'user'
              ? 'bg-blue-100 text-right self-end'
              : 'bg-gray-100 text-left self-start'
              }`}
          >
            {msg.role === 'assistant' ? (
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && <div className="italic text-gray-400">Thinking...</div>}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Ask something..."
          className="flex-1 resize-none max-h-40 overflow-auto"
        />
        <Button onClick={sendMessage} className="h-full w-16">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

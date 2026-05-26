import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './Chat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  context: string
  topic: string
}

export default function Chat({ context, topic }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Reset chat when topic changes
  useEffect(() => {
    setMessages([])
  }, [topic])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          history: messages,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Erro ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: unknown) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erro: ${e instanceof Error ? e.message : 'tente novamente.'}`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`chat${collapsed ? ' chat-collapsed' : ''}`}>
      <div className="chat-header" onClick={() => setCollapsed(c => !c)}>
        <div className="chat-header-dot" />
        <span>Chat sobre o conteúdo</span>
        <button
          className="chat-toggle"
          aria-label={collapsed ? 'Expandir chat' : 'Minimizar chat'}
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {collapsed
              ? <polyline points="18,15 12,9 6,15" />
              : <polyline points="6,9 12,15 18,9" />}
          </svg>
        </button>
      </div>

      {!collapsed && <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-intro">
            <p>Tire dúvidas sobre <strong>{topic}</strong></p>
            <div className="chat-suggestions">
              {['Quais são os critérios diagnósticos?', 'Como é o tratamento?', 'Explica a fisiopatologia'].map(s => (
                <button key={s} onClick={() => { setInput(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            <div className="msg-bubble">
              {m.role === 'assistant'
                ? <ReactMarkdown>{m.content}</ReactMarkdown>
                : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg msg-assistant">
            <div className="msg-bubble msg-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>}

      {!collapsed && <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="Pergunte sobre o conteúdo..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button className="chat-send" onClick={send} disabled={loading || !input.trim()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>}
    </div>
  )
}

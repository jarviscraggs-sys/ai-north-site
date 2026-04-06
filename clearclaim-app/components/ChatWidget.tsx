'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  role: 'contractor' | 'subcontractor' | 'employee';
}

const welcomeMessages: Record<Props['role'], string> = {
  contractor:
    "Hi! I'm your ClearClaim Assistant. I can help with invoices, CIS, timesheets, compliance and anything else on the platform. What do you need help with?",
  subcontractor:
    "Hi! I'm your ClearClaim Assistant. I can help you submit invoices, understand your CIS deductions, track payments and more. What can I help with?",
  employee:
    "Hi! I'm your ClearClaim Assistant. I can help you log timesheets, request holidays and navigate the platform. What do you need?",
};

const quickQuestions: Record<Props['role'], string[]> = {
  contractor: [
    'How do I approve an invoice?',
    'How does CIS work?',
    'How do I invite a subcontractor?',
  ],
  subcontractor: [
    'How do I submit an invoice?',
    'What is retention?',
    'Why was my invoice queried?',
  ],
  employee: [
    'How do I submit a timesheet?',
    'How do I request holiday?',
    'How do I check my holiday balance?',
  ],
};

const roleBadges: Record<Props['role'], string> = {
  contractor: 'Contractor Help',
  subcontractor: 'Subcontractor Help',
  employee: 'Employee Help',
};

export default function ChatWidget({ role }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setHasStarted(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, role }),
      });

      const data = await res.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content || "Sorry, I couldn't get a response.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col"
          style={{
            width: '380px',
            height: '520px',
            background: '#0d1526',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{ flexShrink: 0 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">
                ClearClaim Assistant 🤖
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}
              >
                {roleBadges[role]}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {/* Welcome message */}
            <div className="flex items-start gap-2">
              <div
                className="text-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
              >
                {welcomeMessages[role]}
              </div>
            </div>

            {/* Quick question chips — only before first user message */}
            {!hasStarted && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickQuestions[role].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="text-sm rounded-2xl px-3 py-2 max-w-[85%] whitespace-pre-wrap"
                  style={
                    msg.role === 'user'
                      ? { background: '#2563eb', color: '#fff', borderRadius: '1rem 1rem 0.25rem 1rem' }
                      : { background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', borderRadius: '1rem 1rem 1rem 0.25rem' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-blue-400"
                        style={{
                          animation: 'bounce 1.2s ease-in-out infinite',
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-white/10"
            style={{ flexShrink: 0 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              disabled={isLoading}
              className="flex-1 text-sm rounded-xl px-3 py-2 outline-none text-white placeholder-white/30 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
              style={{ background: '#2563eb', color: '#fff', flexShrink: 0 }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open ClearClaim Assistant"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{ width: 56, height: 56, background: '#2563eb', flexShrink: 0 }}
      >
        {/* Unread badge — shown when closed and not started */}
        {!isOpen && !hasStarted && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ width: 20, height: 20, background: '#ef4444', fontSize: 11 }}
          >
            ?
          </span>
        )}
        {isOpen ? (
          /* X icon */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          /* Chat bubble icon */
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Bounce keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}

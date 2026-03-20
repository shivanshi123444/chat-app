import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import API from '../api'

const ROOMS = ['general', 'random', 'tech', 'career']
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Chat() {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [room, setRoom] = useState('general')
  const [typing, setTyping] = useState('')
  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const socket = io(API_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('receive_message', msg => setMessages(prev => [...prev, msg]))
    socket.on('user_typing', ({ username }) => {
      if (username !== user.username) setTyping(`${username} is typing...`)
    })
    socket.on('user_stop_typing', () => setTyping(''))

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (!socketRef.current) return
    socketRef.current.emit('join_room', room)
    API.get(`/api/messages/${room}`)
      .then(res => setMessages(res.data))
      .catch(console.error)
  }, [room])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    socketRef.current.emit('send_message', { room, content: input.trim() })
    socketRef.current.emit('stop_typing', { room })
    setInput('')
  }

  const handleTyping = (e) => {
    setInput(e.target.value)
    socketRef.current.emit('typing', { room })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socketRef.current.emit('stop_typing', { room })
    }, 1000)
  }

  const isMe = (msg) => {
    return msg.sender?._id === user?.id ||
           msg.sender?.username === user?.username ||
           msg.sender === user?.id
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, sans-serif' }}>

      <div style={{ width: '240px', background: '#1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #334155' }}>
          <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '18px', margin: 0 }}>💬 ChatApp</p>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>@{user?.username}</p>
        </div>

        <div style={{ flex: 1, padding: '16px 8px' }}>
          <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', padding: '0 8px', marginBottom: '8px' }}>CHANNELS</p>
          {ROOMS.map(r => (
            <button key={r} onClick={() => setRoom(r)}
              style={{ width: '100%', textAlign: 'left', background: room === r ? '#334155' : 'transparent', color: room === r ? '#f1f5f9' : '#94a3b8', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', cursor: 'pointer', marginBottom: '2px' }}>
              # {r}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
          <button onClick={logout}
            style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

        <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '16px' }}># {room}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{messages.length} messages</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}/>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Online</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '80px' }}>
              <p style={{ fontSize: '32px' }}>💬</p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>No messages yet</p>
              <p style={{ fontSize: '13px' }}>Be the first to say something in #{room}!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const mine = isMe(msg)
            return (
              <div key={msg._id || i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                <div style={{ maxWidth: '65%' }}>
                  {!mine && (
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
                      {msg.sender?.username || 'Unknown'}
                    </p>
                  )}
                  <div style={{ background: mine ? '#2563eb' : 'white', color: mine ? 'white' : '#111827', padding: '10px 16px', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '14px', lineHeight: '1.5', border: mine ? 'none' : '1px solid #e5e7eb', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textAlign: mine ? 'right' : 'left' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          {typing && (
            <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{typing}</p>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '16px 24px' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px' }}>
            <input value={input} onChange={handleTyping}
              placeholder={`Message #${room}...`}
              style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', outline: 'none', background: '#f9fafb' }}
            />
            <button type="submit" disabled={!input.trim()}
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: input.trim() ? 1 : 0.5 }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
import { useState, useRef, useEffect } from 'react'
import './App.css'

const API = 'http://localhost:5000/api'

interface PasteEvent {
  time: string
  charCount: number
  preview: string
}

interface KeystrokeStats {
  avgSpeed: number
  totalKeystrokes: number
  longPauses: number
}

interface Session {
  _id: string
  createdAt: string
  text: string
  keystrokeStats: KeystrokeStats
  pasteCount: number
}

type Screen = 'login' | 'register' | 'editor'

// SVG Icons
const Icons = {
  Keyboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"></path></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  Pause: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  Alert: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  FileText: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  User: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  Activity: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  History: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><polyline points="12 7 12 12 15 15"></polyline></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
}

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '')
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [pasteEvents, setPasteEvents] = useState<PasteEvent[]>([])
  const [keystrokeStats, setKeystrokeStats] = useState<KeystrokeStats>({
    avgSpeed: 0, totalKeystrokes: 0, longPauses: 0,
  })
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeTab, setActiveTab] = useState<'monitor' | 'history'>('monitor')
  const [savedMsg, setSavedMsg] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const lastKeyTime = useRef<number | null>(null)
  const intervals = useRef<number[]>([])
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (token) {
      setScreen('editor')
      fetchSessions()
    }
  }, [token])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) setSessions(data)
    } catch {
      // ignore
    }
  }

  const handleAuth = async (type: 'login' | 'register') => {
    setError('')
    try {
      const res = await fetch(`${API}/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('userEmail', data.email)
      setToken(data.token)
      setUserEmail(data.email)
      setScreen('editor')
    } catch {
      setError('Something went wrong. Ensure the backend is running.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setToken('')
    setUserEmail('')
    setScreen('login')
    setText('')
    setPasteEvents([])
    setKeystrokeStats({ avgSpeed: 0, totalKeystrokes: 0, longPauses: 0 })
    setPassword('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      // Insert tab in text
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      setText(text.substring(0, start) + '\t' + text.substring(end));
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1;
      }, 0);
    }
    
    // Typing indicator logic
    setIsTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => setIsTyping(false), 1000)

    const now = Date.now()
    if (lastKeyTime.current !== null) {
      const interval = now - lastKeyTime.current
      if (interval < 5000) {
        intervals.current.push(interval)
        if (intervals.current.length > 50) intervals.current.shift() // Keep memory bounded if needed, though they had no bound originally
        
        const avg = intervals.current.reduce((a, b) => a + b, 0) / intervals.current.length
        const cpm = avg > 0 ? Math.round(60000 / avg) : 0
        const longPauses = intervals.current.filter(i => i > 1000).length
        setKeystrokeStats({ avgSpeed: cpm, totalKeystrokes: keystrokeStats.totalKeystrokes + 1, longPauses })
      }
    } else {
        // Increment for the very first keystroke
        setKeystrokeStats(prev => ({ ...prev, totalKeystrokes: prev.totalKeystrokes + 1 }))
    }
    lastKeyTime.current = now
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text')
    if (!pastedText) return
    setPasteEvents(prev => [{
      time: new Date().toLocaleTimeString(),
      charCount: pastedText.length,
      preview: pastedText.slice(0, 50) + (pastedText.length > 50 ? '...' : ''),
    }, ...prev])
  }

  const handleSave = async () => {
    if (!text.trim()) return
    try {
      const res = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text, keystrokeStats, pasteCount: pasteEvents.length })
      })
      if (res.ok) {
        setText('')
        setPasteEvents([])
        setKeystrokeStats({ avgSpeed: 0, totalKeystrokes: 0, longPauses: 0 })
        lastKeyTime.current = null
        intervals.current = []
        setSavedMsg(true)
        setTimeout(() => setSavedMsg(false), 2000)
        fetchSessions()
      }
    } catch {
      alert('Failed to save session. Ensure the backend is running.')
    }
  }

  const getSpeedStyles = (cpm: number) => {
    if (cpm === 0) return { label: 'PENDING', bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
    if (cpm < 150) return { label: 'SLOW', bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }
    if (cpm < 300) return { label: 'GOOD', bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }
    return { label: 'FAST', bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }
  }

  const speedData = getSpeedStyles(keystrokeStats.avgSpeed)

  // -- AUTHENTICATION SCREENS --
  if (screen === 'login' || screen === 'register') {
    return (
      <div className="auth-container">
        <div className="auth-card animate-slide-up">
          <div className="auth-header">
            <h1 className="auth-title">Vi-Notes</h1>
            <p className="auth-subtitle">
              {screen === 'login' ? 'Authentication Required' : 'Initialize Account'}
            </p>
          </div>

          {error && <div className="auth-error animate-fade-in"><Icons.Alert /> {error}</div>}

          <div className="form-group">
            <input
              type="email"
              className="input-field"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={() => handleAuth(screen)}>
            {screen === 'login' ? 'Authenticate' : 'Create Context'}
          </button>

          <p className="auth-toggle">
            {screen === 'login' ? "New user? " : "Already initialized? "}
            <span onClick={() => { setScreen(screen === 'login' ? 'register' : 'login'); setError('') }}>
              {screen === 'login' ? 'Register' : 'Login'}
            </span>
          </p>
        </div>
      </div>
    )
  }

  // -- EDITOR SCREEN --
  return (
    <div className="app-layout">
      {/* Editor Panel */}
      <div className="main-panel animate-fade-in">
        <nav className="top-nav">
          <div className="brand">
            <div className="brand-icon"><Icons.Activity /></div>
            <h1>Vi-Notes</h1>
          </div>
          <div className="user-controls">
            <span className="user-email"><Icons.User /> {userEmail}</span>
            <button className="btn-secondary" onClick={handleLogout}>
              <Icons.LogOut /> Disconnect
            </button>
          </div>
        </nav>

        <div className="editor-container">
          <div className="editor-header">
            <div className="editor-title">
               Active Session Buffer
            </div>
            <div className="status-indicator">
              <div className={`status-dot ${isTyping ? 'active' : ''}`}></div>
              {isTyping ? 'Typing...' : 'Idle'}
            </div>
          </div>

          <textarea
            className="editor-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="// Begin writing. Key telemetry is being recorded..."
            spellCheck="false"
          />

          <div className="editor-footer">
            <div className="char-count">
              <Icons.FileText /> LENG: {text.length}
            </div>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!text.trim()}
              style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
            >
              {savedMsg ? <><Icons.Check /> COMMITTED</> : <><Icons.Save /> COMMIT</>}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Analytics */}
      <div className="sidebar animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="sidebar-tabs">
          <button 
            className={`tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            <Icons.Activity /> Telemetry
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Icons.History /> Archives
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'monitor' && (
            <div className="animate-fade-in">
              <h2 className="section-title"><Icons.Keyboard /> Keystroke Dynamics</h2>
              
              <div className="stats-card">
                <div className="stat-row">
                  <span className="stat-label">Total Strokes</span>
                  <span className="stat-value">{keystrokeStats.totalKeystrokes}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Avg Speed (CPM)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="stat-value">{keystrokeStats.avgSpeed}</span>
                    <span className="speed-badge" style={{ background: speedData.bg, color: speedData.color }}>
                      {speedData.label}
                    </span>
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Stalls {'>'} 1s</span>
                  <span className="stat-value">{keystrokeStats.longPauses}</span>
                </div>
              </div>

              <h2 className="section-title"><Icons.Alert /> Paste Signatures</h2>
              {pasteEvents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No anomalies detected in clipboard activity.</p>
              ) : (
                pasteEvents.map((event, i) => (
                  <div key={i} className="warning-card animate-slide-up">
                    <div className="warning-header">
                      <Icons.Alert /> Unsafe Transfer Event
                    </div>
                    <div className="warning-meta">
                      <Icons.Clock /> {event.time} | LENG: {event.charCount}
                    </div>
                    <div className="warning-preview">
                      "{event.preview}"
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-fade-in">
              <h2 className="section-title"><Icons.Save /> Committed Sessions</h2>
              {sessions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No historical records found for this user.</p>
              ) : (
                sessions.map(session => (
                  <div key={session._id} className="history-card">
                    <div className="history-time">
                      <Icons.Clock /> {new Date(session.createdAt).toLocaleString()}
                    </div>
                    <div className="history-text">
                      {session.text}
                    </div>
                    <div className="history-stats">
                      <span><Icons.Keyboard /> {session.keystrokeStats.totalKeystrokes}</span>
                      <span><Icons.Zap /> {session.keystrokeStats.avgSpeed} cpm</span>
                      <span style={{ color: session.pasteCount > 0 ? 'var(--warning)' : 'inherit' }}>
                        <Icons.Alert /> {session.pasteCount} pastes
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
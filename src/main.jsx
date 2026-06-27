import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './index.css'

const TOKEN_KEY = 'i-notes-token'
const USERS_KEY = 'i-notes-users'
const NOTES_KEY = 'i-notes-notes'
const DEFAULT_CATEGORIES = ['Personal', 'Work', 'Ideas', 'Archive']

const hashPassword = (password) => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

const getUsers = () => {
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : {}
}

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const getUserNotes = (userId) => {
  const notes = localStorage.getItem(NOTES_KEY)
  const allNotes = notes ? JSON.parse(notes) : {}
  return allNotes[userId] || []
}

const saveUserNotes = (userId, notes) => {
  const allNotes = localStorage.getItem(NOTES_KEY)
  const notesData = allNotes ? JSON.parse(allNotes) : {}
  notesData[userId] = notes
  localStorage.setItem(NOTES_KEY, JSON.stringify(notesData))
}

const getToken = () => localStorage.getItem(TOKEN_KEY)
const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token)
const clearToken = () => localStorage.removeItem(TOKEN_KEY)

function App() {
  const [user, setUser] = useState(() => {
    const token = getToken()
    if (!token) return null
    const users = getUsers()
    return Object.values(users).find((entry) => entry.email === token) || null
  })
  const [notes, setNotes] = useState(() => {
    const token = getToken()
    if (!token) return []
    const users = getUsers()
    const existingUser = Object.values(users).find((entry) => entry.email === token)
    return existingUser ? getUserNotes(existingUser.email) : []
  })
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('Personal')
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [authMessage, setAuthMessage] = useState('')
  const messageTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current)
      }
    }
  }, [])

  const showMessage = (message) => {
    setAuthMessage(message)
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current)
    }
    messageTimer.current = window.setTimeout(() => {
      setAuthMessage('')
    }, 4000)
  }

  const handleAuthSubmit = (event) => {
    event.preventDefault()
    setAuthMessage('')

    const email = authEmail.trim().toLowerCase()
    const password = authPassword.trim()

    if (!email || !password || (authMode === 'register' && !authName.trim())) {
      showMessage('Please complete all fields.')
      return
    }

    const users = getUsers()

    if (authMode === 'login') {
      const existingUser = users[email]
      if (!existingUser || hashPassword(password) !== existingUser.password) {
        showMessage('Invalid email or password.')
        return
      }

      saveToken(email)
      setUser(existingUser)
      setNotes(getUserNotes(email))
      setAuthEmail('')
      setAuthPassword('')
      showMessage(`Welcome back, ${existingUser.name}!`)
      return
    }

    if (users[email]) {
      showMessage('Email already registered.')
      return
    }

    const newUser = {
      email,
      name: authName.trim(),
      password: hashPassword(password),
    }

    users[email] = newUser
    saveUsers(users)
    saveUserNotes(email, [])
    saveToken(email)
    setUser(newUser)
    setNotes([])
    setAuthName('')
    setAuthEmail('')
    setAuthPassword('')
    showMessage(`Account created for ${newUser.name}.`)
  }

  const handleSignOut = () => {
    clearToken()
    setUser(null)
    setNotes([])
    setFilterCategory('All')
    setActiveNoteId(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteCategory('Personal')
    showMessage('Signed out successfully.')
  }

  const clearEditor = () => {
    setActiveNoteId(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteCategory('Personal')
    showMessage('Ready for a new note.')
  }

  const saveNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      showMessage('Please add both a title and content.')
      return
    }

    const newNote = {
      id: activeNoteId || Date.now(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory.trim() || 'Personal',
      createdAt: new Date().toISOString(),
    }

    if (activeNoteId) {
      const updatedNotes = notes.map((currentNote) =>
        currentNote.id === activeNoteId ? { ...currentNote, ...newNote } : currentNote,
      )
      setNotes(updatedNotes)
      saveUserNotes(user.email, updatedNotes)
      setActiveNoteId(null)
      setNoteTitle('')
      setNoteContent('')
      setNoteCategory('Personal')
      showMessage('Note updated successfully.')
    } else {
      const updatedNotes = [...notes, newNote]
      setNotes(updatedNotes)
      saveUserNotes(user.email, updatedNotes)
      setNoteTitle('')
      setNoteContent('')
      setNoteCategory('Personal')
      showMessage('Note saved successfully.')
    }
  }

  const editNote = (note) => {
    setActiveNoteId(note.id)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteCategory(note.category)
    showMessage('Editing note. Save to update.')
  }

  const deleteNote = (id) => {
    const updatedNotes = notes.filter((note) => note.id !== id)
    setNotes(updatedNotes)
    saveUserNotes(user.email, updatedNotes)
    if (activeNoteId === id) {
      clearEditor()
    }
    showMessage('Note deleted.')
  }

  const categories = useMemo(() => {
    const all = ['All', ...DEFAULT_CATEGORIES]
    notes.forEach((note) => {
      if (note.category && !all.includes(note.category)) {
        all.push(note.category)
      }
    })
    return all
  }, [notes])

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => filterCategory === 'All' || note.category === filterCategory)
  }, [filterCategory, notes])

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="logo-container">
            <svg className="logo" viewBox="0 0 64 64" width="48" height="48">
              <rect x="12" y="8" width="40" height="48" rx="4" fill="none" stroke="#3846ff" strokeWidth="2" />
              <line x1="12" y1="20" x2="52" y2="20" stroke="#3846ff" strokeWidth="2" />
              <line x1="16" y1="28" x2="48" y2="28" stroke="#3846ff" strokeWidth="1.5" opacity="0.6" />
              <line x1="16" y1="36" x2="48" y2="36" stroke="#3846ff" strokeWidth="1.5" opacity="0.6" />
              <line x1="16" y1="44" x2="40" y2="44" stroke="#3846ff" strokeWidth="1.5" opacity="0.6" />
              <text x="32" y="18" fontSize="8" fontWeight="bold" fill="#3846ff" textAnchor="middle" dominantBaseline="middle">
                i
              </text>
            </svg>
          </div>
          <h1>i-notes</h1>
          <p className="auth-description">Sign in or register to store your notes locally.</p>

          <div className="auth-toggle">
            <button
              type="button"
              className={`auth-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-toggle-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? (
              <label>
                Name
                <input
                  type="text"
                  placeholder="Your name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Secure password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
            </label>

            <button type="submit" className="primary-button">
              {authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>

          {authMessage ? <p className="auth-message">{authMessage}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <svg className="logo-small" viewBox="0 0 64 64" width="32" height="32">
            <rect x="12" y="8" width="40" height="48" rx="4" fill="none" stroke="#3846ff" strokeWidth="2" />
            <line x1="12" y1="20" x2="52" y2="20" stroke="#3846ff" strokeWidth="2" />
            <line x1="16" y1="28" x2="48" y2="28" stroke="#3846ff" strokeWidth="1.5" opacity="0.6" />
            <line x1="16" y1="36" x2="48" y2="36" stroke="#3846ff" strokeWidth="1.5" opacity="0.6" />
            <line x1="16" y1="44" x2="40" y2="44" stroke="#3846ff" strokeWidth="1.5" opacity="0.6" />
            <text x="32" y="18" fontSize="8" fontWeight="bold" fill="#3846ff" textAnchor="middle" dominantBaseline="middle">
              i
            </text>
          </svg>
          <div>
            <p className="brand">i-notes</p>
            <span className="user-label">{user.name}</span>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <main className="workspace">
        <section className="sidebar">
          <div className="user-summary">
            <p className="summary-title">Your notes</p>
            <p className="summary-detail">
              {notes.length} saved note{notes.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="category-panel">
            <div className="panel-header">
              <h2>Categories</h2>
              <span>{filteredNotes.length}</span>
            </div>
            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-button ${filterCategory === category ? 'active' : ''}`}
                  onClick={() => setFilterCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="usage-info">
            <p>Notes are saved locally in your browser.</p>
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-header">
            <h2>{activeNoteId ? 'Edit note' : 'New note'}</h2>
          </div>

          <div className="editor-form">
            <label>
              Title
              <input
                type="text"
                placeholder="Note title"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
              />
            </label>

            <label>
              Category
              <select value={noteCategory} onChange={(event) => setNoteCategory(event.target.value)}>
                {DEFAULT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Content
              <textarea
                placeholder="Write your note here..."
                rows="10"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
              />
            </label>

            <div className="editor-actions">
              <button type="button" className="primary-button" onClick={saveNote}>
                {activeNoteId ? 'Update note' : 'Save note'}
              </button>
              {activeNoteId ? (
                <button type="button" className="secondary-button" onClick={clearEditor}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {authMessage ? <p className="editor-message">{authMessage}</p> : null}
        </section>

        <section className="note-list">
          <div className="list-header">
            <h2>Notes</h2>
          </div>

          <div className="notes-container">
            {filteredNotes.length === 0 ? (
              <p className="empty-message">No notes in this category.</p>
            ) : (
              filteredNotes.map((note) => (
                <div key={note.id} className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}>
                  <div className="note-header">
                    <h3>{note.title}</h3>
                    <span className="note-category">{note.category}</span>
                  </div>
                  <p className="note-preview">{note.content.substring(0, 100)}...</p>
                  <div className="note-actions">
                    <button type="button" className="edit-note-btn" onClick={() => editNote(note)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-note-btn"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this note?')) {
                          deleteNote(note.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

const root = createRoot(document.getElementById('app'))
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

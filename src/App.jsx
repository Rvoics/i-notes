import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = '/api'
const TOKEN_KEY = 'notekepper-token'
const DEFAULT_CATEGORIES = ['Personal', 'Work', 'Ideas', 'Archive']

const getToken = () => window.localStorage.getItem(TOKEN_KEY)
const saveToken = (token) => window.localStorage.setItem(TOKEN_KEY, token)
const clearToken = () => window.localStorage.removeItem(TOKEN_KEY)

const apiRequest = async (path, method = 'GET', body = null) => {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || 'API request failed.')
  }

  return payload
}

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [notes, setNotes] = useState([])
  const [filterCategory, setFilterCategory] = useState('All')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('Personal')
  const [activeNoteId, setActiveNoteId] = useState(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const initialize = async () => {
      try {
        const profile = await apiRequest('/me')
        setUser(profile.user)
        setNotes(profile.notes || [])
      } catch {
        clearToken()
      }
    }

    initialize()
  }, [])

  const categories = useMemo(() => {
    const all = ['All', ...DEFAULT_CATEGORIES]
    notes.forEach((note) => {
      if (note.category && !all.includes(note.category)) {
        all.push(note.category)
      }
    })
    return all
  }, [notes])

  const filteredNotes = notes.filter(
    (note) => filterCategory === 'All' || note.category === filterCategory,
  )

  const setMessage = (message) => {
    setAuthMessage(message)
    window.setTimeout(() => setAuthMessage(''), 4000)
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthMessage('')

    const email = authEmail.trim().toLowerCase()
    const password = authPassword.trim()

    if (!email || !password || (authMode === 'register' && !authName.trim())) {
      setMessage('Please complete all fields.')
      return
    }

    const path = authMode === 'login' ? '/auth/login' : '/auth/register'
    const payload = authMode === 'login'
      ? { email, password }
      : { name: authName.trim(), email, password }

    try {
      const response = await apiRequest(path, 'POST', payload)
      saveToken(response.token)
      setUser(response.user)
      setNotes(response.notes || [])
      setAuthName('')
      setAuthEmail('')
      setAuthPassword('')
      setActiveNoteId(null)
      setNoteTitle('')
      setNoteContent('')
      setNoteCategory('Personal')
      setMessage(authMode === 'login'
        ? `Welcome back, ${response.user.name}!`
        : `Account created for ${response.user.name}.`)
    } catch (error) {
      setMessage(error.message)
    }
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
    setMessage('Signed out successfully.')
  }

  const clearEditor = () => {
    setActiveNoteId(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteCategory('Personal')
    setMessage('Ready for a new note.')
  }

  const saveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      setMessage('Please add both a title and content.')
      return
    }

    const body = {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory.trim() || 'Personal',
    }

    try {
      const path = activeNoteId ? `/notes/${activeNoteId}` : '/notes'
      const method = activeNoteId ? 'PUT' : 'POST'
      const response = await apiRequest(path, method, body)
      setNotes(response.notes || [])
      setActiveNoteId(null)
      setNoteTitle('')
      setNoteContent('')
      setNoteCategory('Personal')
      setMessage(activeNoteId ? 'Note updated successfully.' : 'Note saved successfully.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const editNote = (note) => {
    setActiveNoteId(note.id)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteCategory(note.category)
    setMessage('Editing note. Save to update.')
  }

  const deleteNote = async (id) => {
    try {
      const response = await apiRequest(`/notes/${id}`, 'DELETE')
      setNotes(response.notes || [])
      if (activeNoteId === id) {
        clearEditor()
      }
      setMessage('Note deleted.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>NoteKepper</h1>
          <p className="auth-description">Sign in or register to store notes through a backend API.</p>

          <div className="auth-toggle">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <label>
                Name
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Secure password"
              />
            </label>

            <button type="submit" className="primary-button">
              {authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>

          {authMessage && <p className="auth-message">{authMessage}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand">NoteKepper</p>
          <span className="user-label">{user.name}</span>
        </div>
        <button type="button" className="secondary-button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <main className="workspace">
        <section className="sidebar">
          <div className="user-summary">
            <p className="summary-title">Secure notes for {user.name}</p>
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
                  className={filterCategory === category ? 'category-button active' : 'category-button'}
                  onClick={() => setFilterCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="usage-info">
            <p>Notes are saved by the API, and passwords are hashed on the server.</p>
          </div>
        </section>

        <section className="editor-panel">
          <div className="section-heading">
            <div>
              <h2>{activeNoteId ? 'Edit note' : 'New note'}</h2>
              <p>Create a personal note and assign it to a category.</p>
            </div>
            <button type="button" className="secondary-button" onClick={clearEditor}>
              Clear
            </button>
          </div>

          <div className="editor-form">
            <label>
              Title
              <input
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Add a title"
              />
            </label>

            <label>
              Category
              <input
                value={noteCategory}
                onChange={(event) => setNoteCategory(event.target.value)}
                placeholder="Personal, Work, Ideas..."
              />
            </label>

            <label>
              Note
              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Write what you need to remember..."
                rows="8"
              />
            </label>

            <button type="button" className="primary-button save-button" onClick={saveNote}>
              {activeNoteId ? 'Update note' : 'Save note'}
            </button>

            {authMessage && <p className="auth-message auth-message-main">{authMessage}</p>}
          </div>
        </section>

        <section className="note-list">
          <div className="section-heading">
            <div>
              <h2>My notes</h2>
              <p>Tap a note to edit it, or delete it when it's no longer needed.</p>
            </div>
            <span className="note-count">
              {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <div className="empty-state">
                <p>No notes in this category yet.</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <article key={note.id} className="note-card">
                  <div className="note-card-header">
                    <strong>{note.title}</strong>
                    <span>{note.category}</span>
                  </div>
                  <p>{note.content}</p>
                  <div className="note-card-footer">
                    <button type="button" className="link-button" onClick={() => editNote(note)}>
                      Edit
                    </button>
                    <button type="button" className="link-button danger" onClick={() => deleteNote(note.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

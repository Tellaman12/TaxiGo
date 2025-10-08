import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Navbar from './Navbar'
import { useToast } from './Toast'

const Profile = () => {
  const { user, loadFromStorage, saveToStorage, logout } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })
  const { success, error } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, phone: user.phone, role: user.role })
  }, [user])

  const saveProfile = () => {
    const users = loadFromStorage('rg_users', [])
    const idx = users.findIndex(u => u.id === user.id)
    if (idx === -1) return
    users[idx] = { ...users[idx], name: form.name, phone: form.phone }
    saveToStorage('rg_users', users)
    success('Profile updated')
  }

  const deleteAccount = () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    const users = loadFromStorage('rg_users', [])
    const nextUsers = users.filter(u => u.id !== user.id)
    saveToStorage('rg_users', nextUsers)
    // Remove user-owned data
    const bookings = loadFromStorage('rg_bookings', []).filter(b => b.passengerId !== user.id && b.driverId !== user.id)
    saveToStorage('rg_bookings', bookings)
    const vehicles = loadFromStorage('rg_vehicles', []).filter(v => v.driverId !== user.id)
    saveToStorage('rg_vehicles', vehicles)
    logout()
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="container">
      <Navbar />
      <div className="card">
        <h2>Profile</h2>
        <div className="grid" style={{ marginTop: '8px' }}>
          <div className="col-6">
            <label>Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="col-6">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="col-6">
            <label>Email</label>
            <input className="input" value={form.email} disabled />
          </div>
          <div className="col-6">
            <label>Role</label>
            <input className="input" value={form.role} disabled />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button className="btn secondary" onClick={deleteAccount}>Delete Account</button>
          <button className="btn" onClick={saveProfile}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

export default Profile





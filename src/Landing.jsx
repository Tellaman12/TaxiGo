import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'
import Navbar from './Navbar'
import Modal from './Modal'

const Landing = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    password: '', 
    role: 'passenger'
  })
  const [registerHint, setRegisterHint] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState('login')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  
  const { login, register, resetPassword } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const user = await login(loginData.email, loginData.password)
      success(`Welcome back, ${user.name}!`)
      navigate(user.role === 'driver' ? '/driver' : '/passenger')
    } catch (err) {
      error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync active tab with URL hash (#login or #register)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'register') setActiveTab('register')
      else if (hash === 'login') setActiveTab('login')
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await resetPassword(resetEmail, resetPasswordValue)
      setForgotOpen(false)
    } catch (err) {
      error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await register(registerData)
      setSuccessMessage(`Account created successfully! Welcome to RankGo, ${registerData.name}!`)
      setShowSuccessModal(true)
      setRegisterData({ 
        name: '', 
        phone: '', 
        email: '', 
        password: '', 
        role: 'passenger'
      })
    } catch (err) {
      error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container">
      <Navbar />
      
      <div className="card">
        <h1>Book your taxi seat — fast, fair, and rank-friendly</h1>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button className={`btn ${activeTab === 'login' ? '' : 'secondary'}`} onClick={() => setActiveTab('login')}>Login</button>
          <button className={`btn ${activeTab === 'register' ? '' : 'secondary'}`} onClick={() => setActiveTab('register')}>Register</button>
        </div>
        <div className="grid">
          {activeTab === 'login' && (
          <div className="col-6">
            <h2 id="login">Login</h2>
            <form onSubmit={handleLogin}>
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                style={{ marginTop: '8px' }}
              />
              <button 
                className="btn" 
                type="submit" 
                disabled={isLoading}
                style={{ marginTop: '10px' }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
              <a className="link" href="#register" onClick={(e) => { e.preventDefault(); setActiveTab('register') }}>Create account</a>
              <a className="link" href="#forgot" onClick={(e) => { e.preventDefault(); setForgotOpen(true) }}>Forgot password?</a>
            </div>
          </div>
          )}
          {activeTab === 'register' && (
          <div className="col-6">
            <h2 id="register">Register</h2>
            <form onSubmit={handleRegister}>
              <input
                className="input"
                placeholder="Full Name"
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Phone (for notifications)"
                value={registerData.phone}
                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                required
                style={{ marginTop: '8px' }}
              />
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
                style={{ marginTop: '8px' }}
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
                style={{ marginTop: '8px' }}
              />
              <label style={{ marginTop: '8px', display: 'block' }}>Role</label>
              <select
                className="input"
                value={registerData.role}
                onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
              >
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
              </select>
              <button 
                className="btn" 
                type="submit" 
                disabled={isLoading}
                style={{ marginTop: '10px' }}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p className="small" style={{ marginTop: '8px' }}>
              {registerHint}
            </p>
          </div>
          )}
        </div>
      </div>
      
      <div className="footer">
        Built for South Africa taxi ranks • Offline-ready
      </div>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Account Created Successfully!"
        type="success"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 20px', 
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
            {successMessage}
          </p>
          <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>
            You can now log in with your credentials to start booking taxis.
          </p>
          <div className="modal-actions">
            <button 
              className="btn" 
              onClick={() => setShowSuccessModal(false)}
            >
              Get Started
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Password"
      >
        <form onSubmit={handleReset}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="New password"
            value={resetPasswordValue}
            onChange={(e) => setResetPasswordValue(e.target.value)}
            required
            style={{ marginTop: '8px' }}
          />
          <div className="modal-actions">
            <button className="btn secondary" type="button" onClick={() => setForgotOpen(false)}>Cancel</button>
            <button className="btn" type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save new password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Landing

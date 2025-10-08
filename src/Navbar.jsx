import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import messagingService from '../services/messagingService'
import logo from '../../assets/logo.svg'

const Navbar = () => {
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) {
      // Check for unread messages
      const checkUnreadMessages = () => {
        const allBookings = JSON.parse(localStorage.getItem('rg_bookings') || '[]')
        const userBookings = allBookings.filter(booking => 
          booking.passengerId === user.id || booking.driverId === user.id
        )
        
        let totalUnread = 0
        userBookings.forEach(booking => {
          const unread = messagingService.getUnreadCount(booking.id)
          totalUnread += unread
        })
        
        setUnreadCount(totalUnread)
        // Update document title with unread count for extra clarity
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) RankGo • Taxi Seat Booking`
        } else {
          document.title = 'RankGo • Taxi Seat Booking'
        }
      }

      checkUnreadMessages()
      
      // Check every 5 seconds for new messages
      const interval = setInterval(checkUnreadMessages, 5000)
      
      return () => clearInterval(interval)
    }
  }, [user])

  const handleLogout = () => {
    logout()
  }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src={logo} alt="RankGo logo" />
          <div className="brand">RankGo<b>Taxi</b></div>
        </Link>
      </div>
      <div className="nav-right">
        {user ? (
          <>
            <span className="badge">
              {user.role === 'driver' ? 'Driver' : 'Passenger'}: {user.name}
            </span>
            {unreadCount > 0 && (
              <span className="notification-badge" style={{
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                padding: '4px 8px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginRight: '8px'
              }}>
                {unreadCount}
              </span>
            )}
            <Link to="/profile" className="btn secondary">
              Profile
            </Link>
            <Link to="/" className="btn secondary">
              Home
            </Link>
            <button onClick={handleLogout} className="btn secondary">
              Logout
            </button>
          </>
        ) : (
          <>
            <a href="#login">Login</a>
            <a href="#register">Register</a>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar

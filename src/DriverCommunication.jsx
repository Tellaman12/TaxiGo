import React, { useState, useEffect } from 'react'
import { useToast } from './Toast'
import messagingService from '../services/messagingService'
import './DriverCommunication.css'

const DriverCommunication = ({ booking, user, onClose }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    // Load existing messages for this booking
    loadMessages()
    
    // Set up real-time message listening
    const unsubscribe = messagingService.addListener(booking.id, (message) => {
      setMessages(prev => [...prev, message])
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [booking.id])

  const loadMessages = () => {
    const allMessages = messagingService.getMessages(booking.id)
    setMessages(allMessages)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setIsLoading(true)
    try {
      messagingService.sendMessage(
        booking.id,
        user.id,
        user.name,
        newMessage.trim(),
        'text'
      )
      
      setNewMessage('')
      success('Message sent to passenger')
      
      // Show notification for passenger
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Message from Driver', {
          body: `${user.name}: ${newMessage.trim()}`,
          icon: '/assets/logo.svg'
        })
      }
    } catch (err) {
      error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const sendQuickAlert = async (alertType) => {
    const alertMessages = {
      arrived: "🚗 I've arrived at the pickup location",
      waiting: "⏰ I'm waiting for you at the pickup point",
      delayed: "⏳ I'm running a few minutes late, please wait",
      urgent: "🚨 Urgent: Please contact me immediately"
    }

    const message = alertMessages[alertType]
    if (!message) return

    setIsLoading(true)
    try {
      messagingService.sendMessage(
        booking.id,
        user.id,
        user.name,
        message,
        'alert'
      )
      
      success('Alert sent')
    } catch (err) {
      error('Failed to send alert')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="communication-overlay">
      <div className="communication-modal">
        <div className="communication-header">
          <h3>💬 Communication with {booking.passengerName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="booking-info">
          <div className="booking-details">
            <span className="booking-ref">Ref: {booking.ref}</span>
            <span className="booking-route">{booking.origin} → {booking.dest}</span>
            <span className="booking-time">{booking.time}</span>
          </div>
        </div>

        <div className="quick-alerts">
          <h4>Quick Alerts</h4>
          <div className="alert-buttons">
            <button 
              className="alert-btn arrived" 
              onClick={() => sendQuickAlert('arrived')}
              disabled={isLoading}
            >
              🚗 I've Arrived
            </button>
            <button 
              className="alert-btn waiting" 
              onClick={() => sendQuickAlert('waiting')}
              disabled={isLoading}
            >
              ⏰ I'm Waiting
            </button>
            <button 
              className="alert-btn delayed" 
              onClick={() => sendQuickAlert('delayed')}
              disabled={isLoading}
            >
              ⏳ I'm Late
            </button>
            <button 
              className="alert-btn urgent" 
              onClick={() => sendQuickAlert('urgent')}
              disabled={isLoading}
            >
              🚨 Urgent
            </button>
          </div>
        </div>

        <div className="messages-container">
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map(message => (
                <div 
                  key={message.id} 
                  className={`message ${message.senderId === user.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    <div className="message-header">
                      <span className="sender-name">{message.senderName}</span>
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                    </div>
                    <div className={`message-text ${message.type}`}>
                      {message.message}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={sendMessage} className="message-form">
          <div className="input-group">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="message-input"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="send-btn"
              disabled={isLoading || !newMessage.trim()}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DriverCommunication









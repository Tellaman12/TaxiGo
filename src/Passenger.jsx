import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'
import Navbar from './Navbar'
import TrackingMap from './TrackingMap'
import FilterComponent from './FilterComponent'
import DriverCommunication from './DriverCommunication'
import messagingService from '../services/messagingService'
import Modal from './Modal'
import receiptService from '../services/receiptService'

const Passenger = () => {
  const [vehicles, setVehicles] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [showBookingCard, setShowBookingCard] = useState(false)
  const [showTracking, setShowTracking] = useState(false)
  const [trackingBooking, setTrackingBooking] = useState(null)
  const [currentFilters, setCurrentFilters] = useState({})
  const [showCommunication, setShowCommunication] = useState(false)
  const [communicationBooking, setCommunicationBooking] = useState(null)
  const [showRating, setShowRating] = useState(false)
  const [ratingBooking, setRatingBooking] = useState(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelReqModal, setShowCancelReqModal] = useState(false)
  const [cancelReqTarget, setCancelReqTarget] = useState(null)
  const [cancelReqReason, setCancelReqReason] = useState('')
  
  const { user, loadFromStorage, saveToStorage, generateId } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadVehicles()
    loadBookings()
  }, [])

  // Ask for browser notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}) } catch {}
    }
  }, [])

  // Time-based alerts: 30/15 minutes before departure for paid bookings
  useEffect(() => {
    const interval = setInterval(() => {
      const allBookings = loadFromStorage('rg_bookings', [])
      let updated = false
      allBookings
        .filter(b => b.passengerId === user.id && b.status === 'PAID')
        .forEach(b => {
          const departure = parseDepartureToday(b.time)
          if (!departure) return
          const minsLeft = Math.floor((departure.getTime() - Date.now()) / 60000)
          if (minsLeft <= 30 && minsLeft > 20 && !b.alert30Sent) {
            success('Your ride departs in ~30 minutes')
            console.log('[Email]', user.email, `Ride ${b.ref} departs in ~30 minutes.`)
            console.log('[SMS]', user.phone, `Ride ${b.ref} departs in ~30 minutes.`)
            b.alert30Sent = true
            updated = true
          }
          if (minsLeft <= 15 && minsLeft > 5 && !b.alert15Sent) {
            success('Your ride departs in ~15 minutes')
            console.log('[Email]', user.email, `Ride ${b.ref} departs in ~15 minutes.`)
            console.log('[SMS]', user.phone, `Ride ${b.ref} departs in ~15 minutes.`)
            b.alert15Sent = true
            updated = true
          }
          // Driver on-the-way native notification (fallback if message listener missed)
          if (b.driverStatus === 'ON_THE_WAY' && !b.onTheWayAlertSent) {
            showBrowserNotification('Your ride is on the way', `${b.taxiName} is heading to your pickup`)
            success('Your ride is on the way')
            console.log('[Email]', user.email, `Ride ${b.ref} (${b.taxiName}) is on the way`)
            console.log('[SMS]', user.phone, `Ride ${b.ref} (${b.taxiName}) is on the way`)
            b.onTheWayAlertSent = true
            updated = true
          }
        })
      if (updated) {
        saveToStorage('rg_bookings', allBookings)
        loadBookings()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [user, loadFromStorage, saveToStorage])

  const parseDepartureToday = (timeStr) => {
    // Expect format HH:mm
    if (!timeStr || !/^[0-9]{2}:[0-9]{2}$/.test(timeStr)) return null
    const [h, m] = timeStr.split(':').map(n => parseInt(n, 10))
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d
  }

  const showBrowserNotification = (title, body) => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body }) } catch {}
    }
  }

  // Listen for driver status updates via messaging service to trigger real-time native notification
  useEffect(() => {
    if (!user) return
    const allBookings = loadFromStorage('rg_bookings', [])
    const myBookings = allBookings.filter(b => b.passengerId === user.id)
    const unsubs = myBookings.map(b =>
      messagingService.addListener(b.id, (message) => {
        if (message?.type === 'status' && message?.metadata?.status === 'ON_THE_WAY') {
          showBrowserNotification('Your ride is on the way', `${b.taxiName} is heading to your pickup`)
          success('Your ride is on the way')
          // mark sent
          const all = loadFromStorage('rg_bookings', [])
          const idx = all.findIndex(x => x.id === b.id)
          if (idx !== -1) {
            all[idx].onTheWayAlertSent = true
            saveToStorage('rg_bookings', all)
            loadBookings()
          }
        }
      })
    )
    return () => { unsubs.forEach(u => { try { u() } catch {} }) }
  }, [user, bookings])

  useEffect(() => {
    // Apply filters whenever vehicles or filters change
    applyFilters()
  }, [vehicles, currentFilters])

  const loadVehicles = () => {
    const allVehicles = loadFromStorage('rg_vehicles', [])
    setVehicles(allVehicles)
  }

  const loadBookings = () => {
    const allBookings = loadFromStorage('rg_bookings', [])
    const userBookings = allBookings.filter(b => b.passengerId === user.id)
    setBookings(userBookings)
  }

  const applyFilters = () => {
    let filtered = [...vehicles]

    // Apply origin filter
    if (currentFilters.origin) {
      filtered = filtered.filter(v => 
        v.origin.toLowerCase().includes(currentFilters.origin.toLowerCase())
      )
    }

    // Apply destination filter
    if (currentFilters.destination) {
      filtered = filtered.filter(v => 
        v.dest.toLowerCase().includes(currentFilters.destination.toLowerCase())
      )
    }

    // Apply price range filter
    if (currentFilters.priceRange) {
      const [minPrice, maxPrice] = currentFilters.priceRange
      filtered = filtered.filter(v => 
        v.price >= minPrice && v.price <= maxPrice
      )
    }

    // Apply seats filter
    if (currentFilters.seats) {
      filtered = filtered.filter(v => v.seats >= currentFilters.seats)
    }

    // Apply sorting
    if (currentFilters.sortBy) {
      switch (currentFilters.sortBy) {
        case 'price':
          filtered.sort((a, b) => a.price - b.price)
          break
        case 'time':
          filtered.sort((a, b) => a.times[0].localeCompare(b.times[0]))
          break
        case 'seats':
          filtered.sort((a, b) => b.seats - a.seats)
          break
        case 'popularity':
          // Sort by number of bookings (simplified)
          filtered.sort((a, b) => b.seats - a.seats)
          break
        default:
          break
      }
    }

    setFilteredVehicles(filtered)
    
    // Show success message if filters were applied
    if (Object.keys(currentFilters).length > 0) {
      success(`Found ${filtered.length} taxis matching your criteria`)
    }
  }

  const handleFilter = (filters) => {
    setCurrentFilters(filters)
    // The success message will be shown after applyFilters runs
  }

  const handleClearFilters = () => {
    setCurrentFilters({})
    setFilteredVehicles(vehicles)
    success('Filters cleared')
  }

  const getSeatsLeft = (vehicleId, time) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) return 0
    
    const used = loadFromStorage('rg_bookings', [])
      .filter(b => b.vehicleId === vehicleId && b.time === time && b.status !== 'CANCELLED')
      .reduce((acc, b) => acc + Number(b.seats || 0), 0)
    
    return Math.max(0, (Number(vehicle.seats) || 0) - used)
  }

  const selectVehicle = (vehicleId, time, seats, pickupType, pickupLocation) => {
    const vehicle = filteredVehicles.find(v => v.id === vehicleId)
    if (!vehicle) return

    const seatsLeft = getSeatsLeft(vehicleId, time)
    if (seats > seatsLeft) {
      alert(`Only ${seatsLeft} seat(s) left for ${time}.`)
      return
    }

    setSelectedVehicle({
      vehicle,
      time,
      seats,
      pickupType,
      pickupLocation
    })
    setShowBookingCard(true)
  }

  const cancelBooking = () => {
    setSelectedVehicle(null)
    setShowBookingCard(false)
  }

  const confirmBooking = () => {
    if (!selectedVehicle) {
      alert('Select a taxi first.')
      return
    }

    const { vehicle, time, seats, pickupType, pickupLocation } = selectedVehicle
    const ref = generateId('RG')
    const total = vehicle.price * seats
    const allBookings = loadFromStorage('rg_bookings', [])

    // Get driver information
    const allUsers = loadFromStorage('rg_users', [])
    const driverInfo = allUsers.find(u => u.id === vehicle.driverId)

    const booking = {
      id: generateId('B'),
      ref,
      vehicleId: vehicle.id,
      taxiName: vehicle.name,
      driverId: vehicle.driverId,
      driverName: driverInfo?.name || 'Unknown Driver',
      passengerId: user.id,
      passengerName: user.name,
      passengerEmail: user.email,
      passengerPhone: user.phone,
      origin: vehicle.origin,
      dest: vehicle.dest,
      time,
      seats,
      total,
      pickupType,
      pickupLocation,
      status: 'UNPAID',
      createdAt: Date.now()
    }

    allBookings.push(booking)
    saveToStorage('rg_bookings', allBookings)
    
    // Save payment context
    saveToStorage('rg_pay_ctx', {
      ref,
      vehicleId: vehicle.id,
      taxiName: vehicle.name,
      origin: vehicle.origin,
      dest: vehicle.dest,
      time,
      seats,
      total,
      passengerId: user.id
    })

    // Notify user and driver (simulated)
    console.log('[Email]', user.email, `Booking ${ref} confirmed: ${vehicle.origin}→${vehicle.dest} at ${time}. Total R${total.toFixed(2)}`)
    console.log('[SMS]', user.phone, `Booking ${ref} confirmed: ${vehicle.origin}→${vehicle.dest} at ${time}. Total R${total.toFixed(2)}`)
    
    const driverUser = loadFromStorage('rg_users', []).find(u => u.id === vehicle.driverId)
    if (driverUser) {
      console.log('[SMS]', driverUser.phone, `New booking ${ref}: ${seats} seat(s) for ${time} on ${vehicle.name}.`)
    }
    
    console.log('[Email]', user.email, 'Your RankGo booking', `Ref ${ref}: ${vehicle.origin}→${vehicle.dest} at ${time}. Seats: ${seats}.`)

    navigate('/payment')
  }

  const cancelExistingBooking = (bookingId) => {
    const allBookings = loadFromStorage('rg_bookings', [])
    const idx = allBookings.findIndex(b => b.id === bookingId && b.passengerId === user.id)
    if (idx === -1) {
      error('Booking not found')
      return
    }
    if (allBookings[idx].status === 'CANCELLED') {
      error('Booking already cancelled')
      return
    }
    setCancelTarget(allBookings[idx])
    setCancelReason('')
    setShowCancelModal(true)
  }

  const completeRide = (bookingId) => {
    if (!window.confirm('Mark this ride as completed?')) return
    const allBookings = loadFromStorage('rg_bookings', [])
    const idx = allBookings.findIndex(b => b.id === bookingId && b.passengerId === user.id)
    if (idx === -1) {
      error('Booking not found')
      return
    }
    if (allBookings[idx].status !== 'PAID' && allBookings[idx].status !== 'IN_PROGRESS') {
      error('Only paid rides can be completed')
      return
    }
    allBookings[idx].status = 'COMPLETED'
    allBookings[idx].completedAt = Date.now()
    saveToStorage('rg_bookings', allBookings)
    success('Ride marked as completed')
    setRatingBooking(allBookings[idx])
    setShowRating(true)
    loadBookings()
  }

  const requestCancelPaid = (bookingId) => {
    const allBookings = loadFromStorage('rg_bookings', [])
    const idx = allBookings.findIndex(b => b.id === bookingId && b.passengerId === user.id)
    if (idx === -1) {
      error('Booking not found')
      return
    }
    if (allBookings[idx].status !== 'PAID') {
      error('Only paid bookings can request cancellation')
      return
    }
    setCancelReqTarget(allBookings[idx])
    setCancelReqReason('')
    setShowCancelReqModal(true)
  }

  const openRating = (booking) => {
    setRatingBooking(booking)
    setRatingValue(booking.rating || 5)
    setRatingFeedback(booking.feedback || '')
    setShowRating(true)
  }

  const submitRating = () => {
    if (!ratingBooking) return
    const allBookings = loadFromStorage('rg_bookings', [])
    const idx = allBookings.findIndex(b => b.id === ratingBooking.id && b.passengerId === user.id)
    if (idx === -1) {
      error('Booking not found')
      return
    }
    if (ratingValue < 1 || ratingValue > 5) {
      error('Please select a rating between 1 and 5')
      return
    }
    allBookings[idx].rating = ratingValue
    allBookings[idx].feedback = ratingFeedback
    allBookings[idx].ratedAt = Date.now()
    saveToStorage('rg_bookings', allBookings)
    success('Thanks for your feedback!')
    setShowRating(false)
    setRatingBooking(null)
    setRatingFeedback('')
    loadBookings()
  }

  const downloadReceipt = (booking) => {
    try {
      const receiptData = {
        ...booking,
        paymentMethod: booking.paymentMethod || 'Paid',
        status: booking.status,
        passengerName: booking.passengerName,
        email: booking.passengerEmail || 'N/A',
        phone: booking.passengerPhone || 'N/A',
      }
      receiptService.downloadReceipt(receiptData)
      success('Receipt downloaded')
    } catch (e) {
      error('Failed to generate receipt')
    }
  }

  const formatMoney = (amount) => {
    return `R${(Math.round(amount * 100) / 100).toFixed(2)}`
  }

  const startTracking = (booking) => {
    setTrackingBooking(booking)
    setShowTracking(true)
    success('Starting real-time tracking...')
  }

  const stopTracking = () => {
    setShowTracking(false)
    setTrackingBooking(null)
    success('Tracking stopped')
  }

  const startCommunication = (booking) => {
    setCommunicationBooking(booking)
    setShowCommunication(true)
    success('Opening communication with driver...')
  }

  const stopCommunication = () => {
    setShowCommunication(false)
    setCommunicationBooking(null)
  }

  return (
    <div className="container">
      <Navbar />
      
      <FilterComponent
        onFilter={handleFilter}
        onClear={handleClearFilters}
        showSuggestions={true}
      />

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Available taxis</h2>
          <button 
            className="btn secondary" 
            onClick={() => navigate('/')}
            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
          >
            ← Back to Home
          </button>
        </div>
        <div id="vehicleList">
          {filteredVehicles.length === 0 ? (
            <p className="small">No taxis found. Try different filters.</p>
          ) : (
            filteredVehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onSelect={selectVehicle}
                getSeatsLeft={getSeatsLeft}
              />
            ))
          )}
        </div>
      </div>

      {showBookingCard && selectedVehicle && (
        <div className="card">
          <h2>Booking summary</h2>
          <table className="table">
            <tbody>
              <tr><th>Taxi</th><td>{selectedVehicle.vehicle.name}</td></tr>
              <tr><th>Route</th><td>{selectedVehicle.vehicle.origin} → {selectedVehicle.vehicle.dest}</td></tr>
              <tr><th>Departure</th><td>{selectedVehicle.time}</td></tr>
              <tr><th>Seats</th><td>{selectedVehicle.seats}</td></tr>
              <tr><th>Pickup</th><td>{selectedVehicle.pickupType === 'rank' ? 'Taxi rank' : `Hiking: ${selectedVehicle.pickupLocation || '-'}`}</td></tr>
              <tr><th>Price per seat</th><td>{formatMoney(selectedVehicle.vehicle.price)}</td></tr>
            </tbody>
          </table>
          <div className="sum">
            <div className="badge">Total: {formatMoney(selectedVehicle.vehicle.price * selectedVehicle.seats)}</div>
            <button className="btn secondary" onClick={cancelBooking}>Cancel</button>
            <button className="btn" onClick={confirmBooking}>Proceed to pay</button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Your recent bookings</h2>
        <div id="bookingsList">
          {bookings.length === 0 ? (
            <p className="small">No bookings yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Taxi</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th>Seats</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice().reverse().map(booking => (
                  <tr key={booking.id}>
                    <td>{booking.ref}</td>
                    <td>{booking.taxiName}</td>
                    <td>{booking.origin} → {booking.dest}</td>
                    <td>{booking.time}</td>
                    <td>{booking.seats}</td>
                    <td>{formatMoney(booking.total)}</td>
                    <td>
                      <span className={`badge ${booking.status === 'PAID' ? 'ok' : booking.status === 'UNPAID' ? 'warn' : booking.status === 'COMPLETED' ? 'ok' : booking.status === 'CANCEL_REQUESTED' ? 'warn' : 'err'}`}>
                        {booking.status}
                      </span>
                      {booking.driverStatus === 'ON_THE_WAY' && (
                        <span className="badge" style={{ marginLeft: '6px' }}>On the way</span>
                      )}
                    </td>
                    <td>
                      <div className="booking-actions">
                        {booking.status === 'UNPAID' && (
                          <button 
                            className="btn secondary" 
                            onClick={() => cancelExistingBooking(booking.id)}
                            style={{ fontSize: '0.8rem', padding: '4px 8px', marginRight: '4px' }}
                          >
                            Cancel
                          </button>
                        )}
                        {booking.status === 'PAID' && (
                          <>
                            <button 
                              className="btn secondary" 
                              onClick={() => startTracking(booking)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', marginRight: '4px' }}
                            >
                              Track
                            </button>
                            <button 
                              className="btn" 
                              onClick={() => startCommunication(booking)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            >
                              💬 Message
                            </button>
                            <button 
                              className="btn secondary" 
                              onClick={() => requestCancelPaid(booking.id)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px' }}
                            >
                              Request Cancel
                            </button>
                            <button 
                              className="btn secondary" 
                              onClick={() => downloadReceipt(booking)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px' }}
                            >
                              📄 Receipt
                            </button>
                            <button 
                              className="btn secondary" 
                              onClick={() => completeRide(booking.id)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px' }}
                            >
                              Mark Completed
                            </button>
                          </>
                        )}
                        {booking.status === 'COMPLETED' && (
                          <button 
                            className="btn secondary" 
                            onClick={() => downloadReceipt(booking)}
                            style={{ fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px' }}
                          >
                            📄 Receipt
                          </button>
                        )}
                        {booking.status === 'COMPLETED' && !booking.rating && (
                          <button 
                            className="btn" 
                            onClick={() => openRating(booking)}
                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          >
                            Rate Driver
                          </button>
                        )}
                        {booking.rating && (
                          <span className="small" style={{ marginLeft: '6px' }}>⭐ {booking.rating}/5</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showTracking && trackingBooking && (
        <TrackingMap
          bookingId={trackingBooking.id}
          driverId={trackingBooking.driverId}
          passengerId={trackingBooking.passengerId}
          onClose={stopTracking}
        />
      )}

      {showCommunication && communicationBooking && (
        <DriverCommunication
          booking={communicationBooking}
          user={user}
          onClose={stopCommunication}
        />
      )}

      {showRating && ratingBooking && (
        <div className="card">
          <h3>Rate your ride with {ratingBooking.driverName}</h3>
          <div className="grid" style={{ marginTop: '8px' }}>
            <div className="col-4">
              <label>Rating (1-5)</label>
              <select
                className="input"
                value={ratingValue}
                onChange={(e) => setRatingValue(Number(e.target.value))}
              >
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="col-8">
              <label>Feedback (optional)</label>
              <input
                className="input"
                placeholder="Share anything about your ride"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button className="btn secondary" onClick={() => { setShowRating(false); setRatingBooking(null) }}>Cancel</button>
            <button className="btn" onClick={submitRating}>Submit</button>
          </div>
        </div>
      )}

      {/* Cancel UNPAID modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel booking (10% fee)">
        <div className="grid" style={{ marginTop: '8px' }}>
          <div className="col-12">
            <label>Reason (optional)</label>
            <input className="input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Running late / Change of plans" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button className="btn secondary" onClick={() => setShowCancelModal(false)}>Keep booking</button>
          <button className="btn" onClick={() => {
            if (!cancelTarget) return
            const all = loadFromStorage('rg_bookings', [])
            const idx = all.findIndex(b => b.id === cancelTarget.id)
            if (idx !== -1) {
              all[idx].status = 'CANCELLED'
              all[idx].cancelledAt = Date.now()
              all[idx].cancellationReason = cancelReason || 'Unspecified'
              all[idx].cancelledBy = 'passenger'
              const fee = Math.round((Number(all[idx].total || 0) * 0.10) * 100) / 100
              all[idx].cancellationFee = fee
              saveToStorage('rg_bookings', all)
              success(`Booking cancelled. Fee: R${fee.toFixed(2)}`)
              try { messagingService.sendAlert(all[idx].id, user.id, user.name, 'cancelled', `Passenger cancelled: ${cancelReason || 'Unspecified'}`) } catch {}
              setShowCancelModal(false)
              setCancelTarget(null)
              loadBookings()
            }
          }}>Confirm cancel</button>
        </div>
      </Modal>

      {/* Cancel PAID request modal */}
      <Modal isOpen={showCancelReqModal} onClose={() => setShowCancelReqModal(false)} title="Request cancellation (paid)">
        <div className="grid" style={{ marginTop: '8px' }}>
          <div className="col-12">
            <label>Reason (optional)</label>
            <input className="input" value={cancelReqReason} onChange={(e) => setCancelReqReason(e.target.value)} placeholder="Change of plans / Emergency" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button className="btn secondary" onClick={() => setShowCancelReqModal(false)}>Close</button>
          <button className="btn" onClick={() => {
            if (!cancelReqTarget) return
            const all = loadFromStorage('rg_bookings', [])
            const idx = all.findIndex(b => b.id === cancelReqTarget.id)
            if (idx !== -1) {
              all[idx].status = 'CANCEL_REQUESTED'
              all[idx].cancelRequestAt = Date.now()
              all[idx].cancelRequestReason = cancelReqReason || 'Unspecified'
              saveToStorage('rg_bookings', all)
              success('Cancel request sent to driver')
              try { messagingService.sendText(all[idx].id, user.id, user.name, `Passenger requested cancel: ${cancelReqReason || 'Unspecified'}`) } catch {}
              setShowCancelReqModal(false)
              setCancelReqTarget(null)
              loadBookings()
            }
          }}>Send request</button>
        </div>
      </Modal>
    </div>
  )
}

const VehicleCard = ({ vehicle, onSelect, getSeatsLeft }) => {
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(1)
  const [pickupType, setPickupType] = useState('rank')
  const [pickupLocation, setPickupLocation] = useState('')

  const handleSelect = () => {
    if (!time) {
      alert('Please select a departure time.')
      return
    }
    onSelect(vehicle.id, time, seats, pickupType, pickupLocation)
  }

  return (
    <div className="card" style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div><b>{vehicle.name}</b> · {vehicle.origin} → {vehicle.dest}</div>
        <div className="badge">R{vehicle.price}/seat • {vehicle.seats} total seats</div>
      </div>
      
      <div className="grid" style={{ marginTop: '8px' }}>
        <div className="col-4">
          <label>Departure</label>
          <select 
            className="input" 
            value={time} 
            onChange={(e) => setTime(e.target.value)}
          >
            <option value="">Select time</option>
            {vehicle.times.map(t => (
              <option key={t} value={t}>
                {t} (left: {getSeatsLeft(vehicle.id, t)})
              </option>
            ))}
          </select>
        </div>
        <div className="col-4">
          <label>Seats</label>
          <input
            className="input"
            type="number"
            min="1"
            max={vehicle.seats}
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="col-4">
          <label>Pickup</label>
          <select 
            className="input" 
            value={pickupType} 
            onChange={(e) => setPickupType(e.target.value)}
          >
            <option value="rank">Taxi rank</option>
            <option value="hike">Hiking point</option>
          </select>
          {pickupType === 'hike' && (
            <input
              className="input"
              placeholder="Enter hiking point"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              style={{ marginTop: '8px' }}
            />
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
        <button className="btn" onClick={handleSelect}>Select</button>
      </div>
    </div>
  )
}

export default Passenger

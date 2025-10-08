import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'
import Navbar from './Navbar'
import TrackingMap from './TrackingMap'
import DriverCommunication from './DriverCommunication'
import messagingService from '../services/messagingService'

const Driver = () => {
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    origin: '',
    dest: '',
    seats: 15,
    price: 30,
    times: '',
    registrationNumber: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      branchCode: '',
      accountHolder: ''
    }
  })
  const [vehicleHint, setVehicleHint] = useState('')
  const [showTracking, setShowTracking] = useState(false)
  const [trackingBooking, setTrackingBooking] = useState(null)
  const [showCommunication, setShowCommunication] = useState(false)
  const [communicationBooking, setCommunicationBooking] = useState(null)
  
  const { user, loadFromStorage, saveToStorage, generateId } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadMyVehicles()
    loadDriverBookings()
  }, [])

  const loadMyVehicles = () => {
    const allVehicles = loadFromStorage('rg_vehicles', [])
    const myVehicles = allVehicles.filter(v => v.driverId === user.id)
    setVehicles(myVehicles)
  }

  const updateVehicle = (vehicleId, updates) => {
    const allVehicles = loadFromStorage('rg_vehicles', [])
    const idx = allVehicles.findIndex(v => v.id === vehicleId && v.driverId === user.id)
    if (idx === -1) return
    allVehicles[idx] = { ...allVehicles[idx], ...updates }
    saveToStorage('rg_vehicles', allVehicles)
    loadMyVehicles()
    success('Vehicle updated')
  }

  const deleteVehicle = (vehicleId) => {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return
    const allVehicles = loadFromStorage('rg_vehicles', [])
    const next = allVehicles.filter(v => !(v.id === vehicleId && v.driverId === user.id))
    saveToStorage('rg_vehicles', next)
    loadMyVehicles()
    success('Vehicle deleted')
  }

  const loadDriverBookings = () => {
    const allVehicles = loadFromStorage('rg_vehicles', []).filter(v => v.driverId === user.id)
    const allBookings = loadFromStorage('rg_bookings', [])
    const myBookings = allBookings.filter(b => allVehicles.some(v => v.id === b.vehicleId))
    setBookings(myBookings)
  }

  const addVehicle = () => {
    const { name, origin, dest, seats, price, times, registrationNumber, bankDetails } = vehicleForm
    
    if (!name || !origin || !dest || !times.trim() || !registrationNumber.trim()) {
      alert('Please fill all vehicle fields including registration number.')
      return
    }

    // Validate bank details
    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.branchCode || !bankDetails.accountHolder) {
      alert('Please fill all bank details for payment processing.')
      return
    }

    const timesArray = times.split(',').map(s => s.trim()).filter(Boolean)
    if (timesArray.length === 0) {
      alert('Please enter at least one departure time.')
      return
    }

    const allVehicles = loadFromStorage('rg_vehicles', [])
    const newVehicle = {
      id: generateId('V'),
      driverId: user.id,
      name: name.trim(),
      registrationNumber: registrationNumber.trim(),
      origin: origin.trim(),
      dest: dest.trim(),
      seats: Math.max(1, parseInt(seats) || 15),
      price: Math.max(0, parseFloat(price) || 0),
      times: timesArray,
      bankDetails
    }

    allVehicles.push(newVehicle)
    saveToStorage('rg_vehicles', allVehicles)
    
    setVehicleHint('Vehicle added with bank details.')
    setVehicleForm({ 
      name: '', 
      origin: '', 
      dest: '', 
      seats: 15, 
      price: 30, 
      times: '',
      registrationNumber: '',
      bankDetails: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountHolder: ''
      }
    })
    loadMyVehicles()
  }

  const formatMoney = (amount) => {
    return `R${(Math.round(amount * 100) / 100).toFixed(2)}`
  }

  const startTracking = (booking) => {
    setTrackingBooking(booking)
    setShowTracking(true)
    success('Starting passenger tracking...')
  }

  const stopTracking = () => {
    setShowTracking(false)
    setTrackingBooking(null)
    success('Tracking stopped')
  }

  const startCommunication = (booking) => {
    setCommunicationBooking(booking)
    setShowCommunication(true)
    success('Opening communication with passenger...')
  }

  const stopCommunication = () => {
    setShowCommunication(false)
    setCommunicationBooking(null)
  }

  const markOnTheWay = (bookingId) => {
    const allBookings = loadFromStorage('rg_bookings', [])
    const idx = allBookings.findIndex(b => b.id === bookingId)
    if (idx === -1) return
    allBookings[idx].driverStatus = 'ON_THE_WAY'
    allBookings[idx].onTheWayAt = Date.now()
    saveToStorage('rg_bookings', allBookings)
    try {
      messagingService.sendMessage(bookingId, user.id, user.name, '🚕 Driver is on the way', 'status', { status: 'ON_THE_WAY' })
    } catch {}
    // Simulated external alerts
    console.log('[Email]', allBookings[idx].passengerEmail || '', `Ride ${allBookings[idx].ref} (${allBookings[idx].taxiName}) is on the way`)
    console.log('[SMS]', allBookings[idx].passengerPhone || '', `Ride ${allBookings[idx].ref} (${allBookings[idx].taxiName}) is on the way`)
    success('Passenger notified: On the way')
    loadDriverBookings()
  }

  const cancelByDriver = (bookingId) => {
    const allBookings = loadFromStorage('rg_bookings', [])
    const idx = allBookings.findIndex(b => b.id === bookingId)
    if (idx === -1) return
    if (allBookings[idx].status === 'CANCELLED') return
    const reason = window.prompt('Enter reason for cancellation:', 'Vehicle issue / Emergency / Delayed') || 'Unspecified'
    allBookings[idx].status = 'CANCELLED'
    allBookings[idx].cancelledAt = Date.now()
    allBookings[idx].cancellationReason = reason
    allBookings[idx].cancelledBy = 'driver'
    saveToStorage('rg_bookings', allBookings)
    try {
      messagingService.sendMessage(bookingId, user.id, user.name, `❌ Driver cancelled: ${reason}`, 'status', { status: 'CANCELLED' })
    } catch {}
    // Simulated external alerts
    console.log('[Email]', allBookings[idx].passengerEmail || '', `Ride ${allBookings[idx].ref} cancelled by driver. Reason: ${reason}`)
    console.log('[SMS]', allBookings[idx].passengerPhone || '', `Ride ${allBookings[idx].ref} cancelled by driver. Reason: ${reason}`)
    success('Booking cancelled and passenger notified')
    loadDriverBookings()
  }

  return (
    <div className="container">
      <Navbar />
      
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>My taxis / routes</h1>
          <button 
            className="btn secondary" 
            onClick={() => navigate('/')}
            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
          >
            ← Back to Home
          </button>
        </div>
        <div className="grid">
          <div className="col-6">
            <h2>Add a vehicle</h2>
            <input
              className="input"
              placeholder="Vehicle name (e.g. Quantum)"
              value={vehicleForm.name}
              onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Registration Number (e.g. CA123GP)"
              value={vehicleForm.registrationNumber}
              onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
              style={{ marginTop: '8px' }}
            />
            <div className="grid" style={{ marginTop: '8px' }}>
              <div className="col-6">
                <input
                  className="input"
                  placeholder="Origin"
                  value={vehicleForm.origin}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, origin: e.target.value })}
                />
              </div>
              <div className="col-6">
                <input
                  className="input"
                  placeholder="Destination"
                  value={vehicleForm.dest}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, dest: e.target.value })}
                />
              </div>
            </div>
            <div className="grid" style={{ marginTop: '8px' }}>
              <div className="col-6">
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={vehicleForm.seats}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, seats: e.target.value })}
                  placeholder="Seats"
                />
              </div>
              <div className="col-6">
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={vehicleForm.price}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, price: e.target.value })}
                  placeholder="Price per seat"
                />
              </div>
            </div>
            <input
              className="input"
              style={{ marginTop: '8px' }}
              placeholder="Departure times (comma-separated, e.g. 06:00,07:30,09:00)"
              value={vehicleForm.times}
              onChange={(e) => setVehicleForm({ ...vehicleForm, times: e.target.value })}
            />
            
            {/* Bank Details Section */}
            <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text)' }}>Bank Details (for payments)</h4>
              <input
                className="input"
                placeholder="Bank Name (e.g. Standard Bank)"
                value={vehicleForm.bankDetails.bankName}
                onChange={(e) => setVehicleForm({ 
                  ...vehicleForm, 
                  bankDetails: { ...vehicleForm.bankDetails, bankName: e.target.value }
                })}
                style={{ marginTop: '8px' }}
              />
              <input
                className="input"
                placeholder="Account Number"
                value={vehicleForm.bankDetails.accountNumber}
                onChange={(e) => setVehicleForm({ 
                  ...vehicleForm, 
                  bankDetails: { ...vehicleForm.bankDetails, accountNumber: e.target.value }
                })}
                style={{ marginTop: '8px' }}
              />
              <div className="grid" style={{ marginTop: '8px' }}>
                <div className="col-6">
                  <input
                    className="input"
                    placeholder="Branch Code"
                    value={vehicleForm.bankDetails.branchCode}
                    onChange={(e) => setVehicleForm({ 
                      ...vehicleForm, 
                      bankDetails: { ...vehicleForm.bankDetails, branchCode: e.target.value }
                    })}
                  />
                </div>
                <div className="col-6">
                  <input
                    className="input"
                    placeholder="Account Holder Name"
                    value={vehicleForm.bankDetails.accountHolder}
                    onChange={(e) => setVehicleForm({ 
                      ...vehicleForm, 
                      bankDetails: { ...vehicleForm.bankDetails, accountHolder: e.target.value }
                    })}
                  />
                </div>
              </div>
              <p className="small" style={{ marginTop: '8px', color: 'var(--text-dim)' }}>
                Bank details are required for payment processing and receipts
              </p>
            </div>
            
            <button className="btn" onClick={addVehicle} style={{ marginTop: '10px' }}>
              Add vehicle
            </button>
            <p className="small" style={{ marginTop: '6px' }}>
              {vehicleHint}
            </p>
          </div>
          
          <div className="col-6">
            <h2>My vehicles</h2>
            <div id="myVehicles">
              {vehicles.length === 0 ? (
                <p className="small">No vehicles yet.</p>
              ) : (
                vehicles.map(vehicle => (
                  <div key={vehicle.id} className="card" style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><b>{vehicle.name}</b> · {vehicle.origin} → {vehicle.dest}</div>
                      <div className="badge">Seats: {vehicle.seats} • {formatMoney(vehicle.price)}/seat</div>
                    </div>
                    <div className="small" style={{ marginTop: '6px' }}>
                      <div>Registration: {vehicle.registrationNumber || 'Not set'}</div>
                      <div>Times: {vehicle.times.join(', ')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <button className="btn secondary" onClick={() => {
                        const name = prompt('Vehicle name', vehicle.name) || vehicle.name
                        const origin = prompt('Origin', vehicle.origin) || vehicle.origin
                        const dest = prompt('Destination', vehicle.dest) || vehicle.dest
                        const seats = Number(prompt('Seats', vehicle.seats) || vehicle.seats)
                        const price = Number(prompt('Price per seat', vehicle.price) || vehicle.price)
                        const times = (prompt('Departure times comma-separated', vehicle.times.join(', ')) || vehicle.times.join(', ')).split(',').map(s => s.trim()).filter(Boolean)
                        const registrationNumber = prompt('Registration Number', vehicle.registrationNumber) || vehicle.registrationNumber
                        const bankName = prompt('Bank Name', vehicle.bankDetails?.bankName || '') || vehicle.bankDetails?.bankName
                        const accountNumber = prompt('Account Number', vehicle.bankDetails?.accountNumber || '') || vehicle.bankDetails?.accountNumber
                        const branchCode = prompt('Branch Code', vehicle.bankDetails?.branchCode || '') || vehicle.bankDetails?.branchCode
                        const accountHolder = prompt('Account Holder', vehicle.bankDetails?.accountHolder || '') || vehicle.bankDetails?.accountHolder
                        updateVehicle(vehicle.id, { name, origin, dest, seats, price, times, registrationNumber, bankDetails: { bankName, accountNumber, branchCode, accountHolder } })
                      }}>Edit</button>
                      <button className="btn secondary" onClick={() => deleteVehicle(vehicle.id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Bookings for my taxis</h2>
        <div id="driverBookings">
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
                  <th>Passenger</th>
                  <th>Seats</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Pickup</th>
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
                    <td>{booking.passengerName || ''}</td>
                    <td>{booking.seats}</td>
                    <td>{formatMoney(booking.total)}</td>
                    <td>{booking.status}</td>
                    <td>{booking.pickupType === 'rank' ? 'Taxi rank' : `Hiking: ${booking.pickupLocation || '-'}`}</td>
                    <td>
                      <div className="booking-actions">
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
                              onClick={() => markOnTheWay(booking.id)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px' }}
                            >
                              On the way
                            </button>
                            <button 
                              className="btn secondary"
                              onClick={() => cancelByDriver(booking.id)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px' }}
                            >
                              Cancel
                            </button>
                          </>
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
    </div>
  )
}

export default Driver

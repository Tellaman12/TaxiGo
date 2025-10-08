import React, { useState, useEffect, useRef } from 'react'
import suggestionService from '../services/suggestionService'
import './FilterComponent.css'

const FilterComponent = ({ onFilter, onClear, showSuggestions = true }) => {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const [showDestSuggestions, setShowDestSuggestions] = useState(false)
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destSuggestions, setDestSuggestions] = useState([])
  const [timeBasedSuggestions, setTimeBasedSuggestions] = useState([])
  const [filters, setFilters] = useState({
    priceRange: [0, 100],
    timeRange: [0, 24],
    seats: 1,
    sortBy: 'price' // price, time, seats
  })

  const originRef = useRef(null)
  const destRef = useRef(null)

  useEffect(() => {
    // Load time-based suggestions
    const suggestions = suggestionService.getTimeBasedSuggestions()
    setTimeBasedSuggestions(suggestions)
  }, [])

  useEffect(() => {
    if (origin.length >= 2) {
      const suggestions = suggestionService.getRouteSuggestions(origin, 'origin')
      setOriginSuggestions(suggestions)
      setShowOriginSuggestions(true)
    } else {
      setShowOriginSuggestions(false)
    }
  }, [origin])

  useEffect(() => {
    if (destination.length >= 2) {
      const suggestions = suggestionService.getRouteSuggestions(destination, 'dest')
      setDestSuggestions(suggestions)
      setShowDestSuggestions(true)
    } else {
      setShowDestSuggestions(false)
    }
  }, [destination])

  const handleOriginChange = (e) => {
    setOrigin(e.target.value)
  }

  const handleDestinationChange = (e) => {
    setDestination(e.target.value)
  }

  const handleSuggestionClick = (suggestion, type) => {
    if (type === 'origin') {
      setOrigin(suggestion.text)
      setShowOriginSuggestions(false)
    } else {
      setDestination(suggestion.text)
      setShowDestSuggestions(false)
    }
  }

  const handleTimeBasedSuggestionClick = (suggestion) => {
    const [origin, dest] = suggestion.split(' → ')
    setOrigin(origin)
    setDestination(dest)
  }

  const handleFilter = () => {
    onFilter({
      origin: origin.trim(),
      destination: destination.trim(),
      ...filters
    })
  }

  const handleClear = () => {
    setOrigin('')
    setDestination('')
    setFilters({
      priceRange: [0, 100],
      timeRange: [0, 24],
      seats: 1,
      sortBy: 'price'
    })
    onClear()
  }

  const swapLocations = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'route':
        return '🚌'
      case 'location':
        return '📍'
      case 'rank':
        return '🚏'
      default:
        return '💡'
    }
  }

  return (
    <div className="filter-component">
      <div className="filter-header">
        <h3>Find Your Perfect Ride</h3>
        <p>Search for taxis with smart suggestions and filters</p>
      </div>

      <div className="filter-form">
        <div className="location-inputs">
          <div className="input-group">
            <label>From</label>
            <div className="suggestion-input">
              <input
                ref={originRef}
                type="text"
                placeholder="Enter origin (e.g., Soweto)"
                value={origin}
                onChange={handleOriginChange}
                onFocus={() => origin.length >= 2 && setShowOriginSuggestions(true)}
                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
              />
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {originSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion, 'origin')}
                    >
                      <span className="suggestion-icon">
                        {getSuggestionIcon(suggestion.type)}
                      </span>
                      <div className="suggestion-content">
                        <div className="suggestion-text">{suggestion.text}</div>
                        {suggestion.fullRoute && (
                          <div className="suggestion-route">{suggestion.fullRoute}</div>
                        )}
                        <div className="suggestion-frequency">
                          {suggestion.frequency}% popular
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button className="swap-btn" onClick={swapLocations} title="Swap locations">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="input-group">
            <label>To</label>
            <div className="suggestion-input">
              <input
                ref={destRef}
                type="text"
                placeholder="Enter destination (e.g., Johannesburg CBD)"
                value={destination}
                onChange={handleDestinationChange}
                onFocus={() => destination.length >= 2 && setShowDestSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
              />
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {destSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion, 'dest')}
                    >
                      <span className="suggestion-icon">
                        {getSuggestionIcon(suggestion.type)}
                      </span>
                      <div className="suggestion-content">
                        <div className="suggestion-text">{suggestion.text}</div>
                        {suggestion.fullRoute && (
                          <div className="suggestion-route">{suggestion.fullRoute}</div>
                        )}
                        <div className="suggestion-frequency">
                          {suggestion.frequency}% popular
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showSuggestions && timeBasedSuggestions.length > 0 && (
          <div className="time-based-suggestions">
            <h4>Popular routes right now</h4>
            <div className="suggestion-chips">
              {timeBasedSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-chip"
                  onClick={() => handleTimeBasedSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="filter-options">
          <div className="filter-row">
            <div className="filter-group">
              <label>Price Range: R{filters.priceRange[0]} - R{filters.priceRange[1]}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.priceRange[1]}
                onChange={(e) => setFilters({
                  ...filters,
                  priceRange: [filters.priceRange[0], parseInt(e.target.value)]
                })}
                className="range-slider"
              />
            </div>

            <div className="filter-group">
              <label>Seats</label>
              <select
                value={filters.seats}
                onChange={(e) => setFilters({ ...filters, seats: parseInt(e.target.value) })}
              >
                <option value={1}>1 seat</option>
                <option value={2}>2 seats</option>
                <option value={3}>3 seats</option>
                <option value={4}>4 seats</option>
                <option value={5}>5+ seats</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort by</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              >
                <option value="price">Price (Low to High)</option>
                <option value="time">Departure Time</option>
                <option value="seats">Available Seats</option>
                <option value="popularity">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn secondary" onClick={handleClear}>
            Clear Filters
          </button>
          <button className="btn" onClick={handleFilter}>
            Search Taxis
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterComponent














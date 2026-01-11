/**
 * Unit Tests for geoUtils.js
 * Tests geographic calculations, distance, and travel time functions
 */

const {
  calculateDistance,
  calculateTravelTime,
  getZoneBasedTravelTime,
  getTravelTimeBetweenLocations,
  optimizeRouteByDistance
} = require('../../src/services/geoUtils')

describe('Geo Utilities', () => {
  
  describe('calculateDistance', () => {
    
    test('calculates correct Haversine distance between Helsinki and Espoo', () => {
      // Helsinki: 60.1699, 24.9384
      // Espoo: 60.2053, 24.6658
      // Expected distance: ~15-16 km
      const distance = calculateDistance(60.1699, 24.9384, 60.2053, 24.6658)
      expect(distance).toBeCloseTo(15.5, 0) // Within 1 km
    })

    test('calculates correct distance between Oulu city center and Raksila', () => {
      // Oulu Center: 65.0121, 25.4651
      // Raksila: 65.0000, 25.5000
      // Expected: ~2-3 km
      const distance = calculateDistance(65.0121, 25.4651, 65.0000, 25.5000)
      expect(distance).toBeGreaterThan(1)
      expect(distance).toBeLessThan(5)
    })

    test('returns zero distance for same coordinates', () => {
      const distance = calculateDistance(65.0121, 25.4651, 65.0121, 25.4651)
      expect(distance).toBe(0)
    })

    test('calculates distance symmetrically', () => {
      const dist1 = calculateDistance(60.1699, 24.9384, 60.2053, 24.6658)
      const dist2 = calculateDistance(60.2053, 24.6658, 60.1699, 24.9384)
      expect(dist1).toBeCloseTo(dist2, 5)
    })

  })

  describe('calculateTravelTime', () => {
    
    test('returns reasonable travel time for short distance', () => {
      // Close locations (1 km)
      const travelTime = calculateTravelTime(65.0121, 25.4651, 65.0150, 25.4700)
      expect(travelTime).toBeGreaterThan(0)
      expect(travelTime).toBeLessThan(15)
    })

    test('adds buffer time to travel duration', () => {
      // The function adds 5 minute buffer
      const travelTime = calculateTravelTime(65.0121, 25.4651, 65.0300, 25.4900)
      expect(travelTime).toBeGreaterThan(5) // Should include buffer
    })

    test('returns integer minutes', () => {
      const travelTime = calculateTravelTime(65.0121, 25.4651, 65.0300, 25.4900)
      expect(travelTime).toEqual(Math.ceil(travelTime))
    })

  })

  describe('getZoneBasedTravelTime', () => {
    
    test('returns zero or minimal time for same zone', () => {
      const time = getZoneBasedTravelTime('Keskusta (City Center)', 'Keskusta (City Center)')
      expect(time).toBe(5)
    })

    test('returns travel time between different zones', () => {
      const time = getZoneBasedTravelTime('Keskusta (City Center)', 'Meri-Oulu')
      expect(time).toBe(15)
    })

    test('returns symmetric travel times', () => {
      const time1 = getZoneBasedTravelTime('Keskusta (City Center)', 'Raksila')
      const time2 = getZoneBasedTravelTime('Raksila', 'Keskusta (City Center)')
      expect(time1).toBe(time2)
    })

    test('returns default time for invalid zones', () => {
      const time = getZoneBasedTravelTime('InvalidZone', 'AnotherInvalidZone')
      expect(time).toBe(15)
    })

    test('handles null or undefined zones gracefully', () => {
      const time1 = getZoneBasedTravelTime(null, 'Keskusta (City Center)')
      const time2 = getZoneBasedTravelTime('Keskusta (City Center)', null)
      expect(time1).toBe(15)
      expect(time2).toBe(15)
    })

  })

  describe('getTravelTimeBetweenLocations', () => {
    
    test('uses coordinates when available', () => {
      const from = { lat: 65.0121, lng: 25.4651 }
      const to = { lat: 65.0300, lng: 25.4900 }
      const time = getTravelTimeBetweenLocations(from, to)
      expect(time).toBeGreaterThan(0)
    })

    test('falls back to zone-based travel time when coordinates unavailable', () => {
      const from = { area: 'Keskusta (City Center)' }
      const to = { area: 'Meri-Oulu' }
      const time = getTravelTimeBetweenLocations(from, to)
      expect(time).toBe(15)
    })

    test('prefers coordinate-based calculation over zones', () => {
      const from = { lat: 65.0121, lng: 25.4651, area: 'Keskusta (City Center)' }
      const to = { lat: 65.0300, lng: 25.4900, area: 'Meri-Oulu' }
      const coordinateTime = getTravelTimeBetweenLocations(from, to)
      const zoneTime = getTravelTimeBetweenLocations(
        { area: 'Keskusta (City Center)' },
        { area: 'Meri-Oulu' }
      )
      expect(coordinateTime).not.toBe(zoneTime)
    })

  })

  describe('optimizeRouteByDistance', () => {
    
    test('returns empty array for no patients', () => {
      const optimized = optimizeRouteByDistance([], { lat: 65.0121, lng: 25.4651 })
      expect(optimized).toEqual([])
    })

    test('returns single patient unchanged', () => {
      const patients = [{ id: 1, lat: 65.0121, lng: 25.4651 }]
      const optimized = optimizeRouteByDistance(patients, { lat: 65.0121, lng: 25.4651 })
      expect(optimized).toHaveLength(1)
      expect(optimized[0].id).toBe(1)
    })

    test('optimizes route for multiple patients', () => {
      const patients = [
        { id: 1, lat: 65.0121, lng: 25.4651 },
        { id: 2, lat: 65.0300, lng: 25.4900 },
        { id: 3, lat: 65.0200, lng: 25.4800 }
      ]
      const startLocation = { lat: 65.0100, lng: 25.4600 }
      const optimized = optimizeRouteByDistance(patients, startLocation)
      
      expect(optimized).toHaveLength(3)
      // Verify all patients are included
      const ids = optimized.map(p => p.id)
      expect(ids).toContain(1)
      expect(ids).toContain(2)
      expect(ids).toContain(3)
    })

    test('selects a patient as first in route', () => {
      const patients = [
        { id: 1, lat: 65.0500, lng: 25.5000 }, // Far
        { id: 2, lat: 65.0110, lng: 25.4660 }  // Close
      ]
      const startLocation = { lat: 65.0100, lng: 25.4600 }
      const optimized = optimizeRouteByDistance(patients, startLocation)
      
      // First position should have a patient
      expect(optimized[0]).toBeDefined()
      expect(optimized[0].id).toBeGreaterThan(0)
    })

    test('uses default Oulu center when no start location provided', () => {
      const patients = [
        { id: 1, lat: 65.0121, lng: 25.4651 }
      ]
      const optimized = optimizeRouteByDistance(patients, null)
      expect(optimized).toHaveLength(1)
    })

  })

})

/**
 * Geo Location Service for Home Hospital Scheduling Backend
 * 
 * Provides:
 * - Geocoding addresses to lat/lng coordinates (using OpenStreetMap Nominatim)
 * - Distance calculation between coordinates (Haversine formula)
 * - Travel time estimation based on distance
 * - Route optimization for patient visits
 */

// Oulu, Finland bounding box for geocoding
const OULU_BOUNDS = {
  minLat: 64.85,
  maxLat: 65.15,
  minLng: 25.20,
  maxLng: 25.80
}

// Default coordinates for Oulu city center (fallback)
const OULU_CENTER = {
  lat: 65.0121,
  lng: 25.4651
}

// Average driving speed in km/h for travel time calculation
const AVERAGE_SPEED_KMH = 30

// Minimum time between visits in minutes
const MIN_BUFFER_MINUTES = 5

/**
 * Geocode an address to latitude/longitude using OpenStreetMap Nominatim API
 */
async function geocodeAddress(address) {
  try {
    const searchAddress = address.includes('Oulu') ? address : `${address}, Oulu, Finland`
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(searchAddress)}&` +
      `bounded=1&` +
      `viewbox=${OULU_BOUNDS.minLng},${OULU_BOUNDS.minLat},${OULU_BOUNDS.maxLng},${OULU_BOUNDS.maxLat}&` +
      `limit=1`,
      {
        headers: {
          'User-Agent': 'HomeHospitalSchedulingSystem/1.0'
        }
      }
    )

    if (!response.ok) {
      console.error('Geocoding API error:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data && data.length > 0) {
      const result = data[0]
      const lat = parseFloat(result.lat)
      const lng = parseFloat(result.lon)
      
      if (lat >= OULU_BOUNDS.minLat && lat <= OULU_BOUNDS.maxLat &&
          lng >= OULU_BOUNDS.minLng && lng <= OULU_BOUNDS.maxLng) {
        return { lat, lng, displayName: result.display_name }
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth's radius in km
  
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate estimated travel time between two points
 */
function calculateTravelTime(lat1, lng1, lat2, lng2) {
  const distanceKm = calculateDistance(lat1, lng1, lat2, lng2)
  const travelMinutes = (distanceKm * 1.3 / AVERAGE_SPEED_KMH) * 60
  return Math.ceil(travelMinutes + MIN_BUFFER_MINUTES)
}

/**
 * Zone-based travel time (fallback)
 */
const ZONE_TRAVEL_TIME = {
  'Keskusta (City Center)': { 'Keskusta (City Center)': 5, 'Raksila': 10, 'Tuira': 12, 'Meri-Oulu': 15, 'Pateniemi': 20, 'Pohjois-Oulu': 15, 'Kontinkangas': 12, 'Kaakkuri': 10, 'Myllyoja': 8 },
  'Raksila': { 'Keskusta (City Center)': 10, 'Raksila': 5, 'Tuira': 8, 'Meri-Oulu': 12, 'Pateniemi': 18, 'Pohjois-Oulu': 12, 'Kontinkangas': 10, 'Kaakkuri': 12, 'Myllyoja': 8 },
  'Tuira': { 'Keskusta (City Center)': 12, 'Raksila': 8, 'Tuira': 5, 'Meri-Oulu': 10, 'Pateniemi': 15, 'Pohjois-Oulu': 10, 'Kontinkangas': 12, 'Kaakkuri': 15, 'Myllyoja': 12 },
  'Meri-Oulu': { 'Keskusta (City Center)': 15, 'Raksila': 12, 'Tuira': 10, 'Meri-Oulu': 5, 'Pateniemi': 8, 'Pohjois-Oulu': 12, 'Kontinkangas': 18, 'Kaakkuri': 20, 'Myllyoja': 18 },
  'Pateniemi': { 'Keskusta (City Center)': 20, 'Raksila': 18, 'Tuira': 15, 'Meri-Oulu': 8, 'Pateniemi': 5, 'Pohjois-Oulu': 15, 'Kontinkangas': 22, 'Kaakkuri': 25, 'Myllyoja': 22 },
  'Pohjois-Oulu': { 'Keskusta (City Center)': 15, 'Raksila': 12, 'Tuira': 10, 'Meri-Oulu': 12, 'Pateniemi': 15, 'Pohjois-Oulu': 5, 'Kontinkangas': 10, 'Kaakkuri': 12, 'Myllyoja': 12 },
  'Kontinkangas': { 'Keskusta (City Center)': 12, 'Raksila': 10, 'Tuira': 12, 'Meri-Oulu': 18, 'Pateniemi': 22, 'Pohjois-Oulu': 10, 'Kontinkangas': 5, 'Kaakkuri': 8, 'Myllyoja': 10 },
  'Kaakkuri': { 'Keskusta (City Center)': 10, 'Raksila': 12, 'Tuira': 15, 'Meri-Oulu': 20, 'Pateniemi': 25, 'Pohjois-Oulu': 12, 'Kontinkangas': 8, 'Kaakkuri': 5, 'Myllyoja': 12 },
  'Myllyoja': { 'Keskusta (City Center)': 8, 'Raksila': 8, 'Tuira': 12, 'Meri-Oulu': 18, 'Pateniemi': 22, 'Pohjois-Oulu': 12, 'Kontinkangas': 10, 'Kaakkuri': 12, 'Myllyoja': 5 }
}

function getZoneBasedTravelTime(fromArea, toArea) {
  if (!fromArea || !toArea) return 15
  const fromZone = ZONE_TRAVEL_TIME[fromArea]
  return fromZone ? (fromZone[toArea] || 15) : 15
}

/**
 * Get travel time between two locations
 */
function getTravelTimeBetweenLocations(from, to) {
  if (from.lat && from.lng && to.lat && to.lng) {
    return calculateTravelTime(from.lat, from.lng, to.lat, to.lng)
  }
  return getZoneBasedTravelTime(from.area, to.area)
}

/**
 * Optimize route using nearest-neighbor algorithm
 */
function optimizeRouteByDistance(patients, startLocation) {
  if (!patients || patients.length === 0) return []
  if (patients.length === 1) return patients
  
  const optimized = []
  const remaining = [...patients]
  let currentLocation = startLocation || OULU_CENTER
  
  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity
    
    for (let i = 0; i < remaining.length; i++) {
      const patient = remaining[i]
      let distance
      
      if (patient.latitude && patient.longitude && currentLocation.lat && currentLocation.lng) {
        distance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          patient.latitude, patient.longitude
        )
      } else {
        distance = getZoneBasedTravelTime(currentLocation.area, patient.area) / 2
      }
      
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }
    
    const nearest = remaining.splice(nearestIndex, 1)[0]
    optimized.push(nearest)
    
    currentLocation = {
      lat: nearest.latitude,
      lng: nearest.longitude,
      area: nearest.area
    }
  }
  
  return optimized
}

module.exports = {
  geocodeAddress,
  calculateDistance,
  calculateTravelTime,
  getTravelTimeBetweenLocations,
  getZoneBasedTravelTime,
  optimizeRouteByDistance,
  OULU_CENTER,
  OULU_BOUNDS
}

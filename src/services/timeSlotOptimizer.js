/**
 * Time Slot Optimizer Service
 * Handles AI-powered scheduling and assignment logic
 */

const { supabase } = require('../config/supabase')
const { calculateTravelTime, calculateDistance, getTravelTimeBetweenLocations } = require('./geoUtils')

// Care type to specialization mapping
const CARE_SPECIALTY_MAP = {
  'wound dressing': ['Wound Care', 'Wound Care Specialist', 'Post-operative Care', 'Nursing Care'],
  'wound care': ['Wound Care', 'Wound Care Specialist', 'Post-operative Care', 'Nursing Care'],
  'post-operative care': ['Post-operative Care', 'Wound Care', 'Nursing Care', 'Acute Care'],
  'iv therapy': ['IV Therapy Specialist', 'Nursing Care', 'Acute Care'],
  'medication administration': ['Medication Administration', 'Medication Management', 'Nursing Care'],
  'palliative care': ['Palliative Care', 'Elderly Care', 'Nursing Care'],
  'respiratory care': ['Respiratory Care', 'Pulmonology', 'Nursing Care'],
  'diabetic care': ['Diabetic Care', 'Chronic Disease Management', 'Endocrinology'],
  'elderly care': ['Elderly Care', 'Home Health Aide', 'Nursing Care', 'Geriatric Care'],
  'home health aide': ['Home Health Aide', 'Nursing Care', 'Elderly Care'],
  'nursing care': ['Nursing Care', 'Home Health Aide', 'Medication Administration'],
  'physical therapy': ['Physical Therapy', 'Rehabilitation', 'Occupational Therapy'],
  'chronic disease management': ['Chronic Disease Management', 'Nursing Care'],
  'cardiac care': ['Cardiac Care', 'Cardiology', 'Cardiovascular Assessment'],
  'general checkup': ['Home Health Aide', 'Nursing Care', 'General Practice']
}

// Care duration by type (in minutes)
const CARE_DURATION = {
  'Wound Dressing': 45,
  'Wound Care Specialist': 45,
  'Post-operative Care': 60,
  'IV Therapy Specialist': 45,
  'Medication Administration': 30,
  'Palliative Care': 60,
  'Respiratory Care': 45,
  'Diabetic Care': 40,
  'Elderly Care': 50,
  'Home Health Aide': 45,
  'Nursing Care': 50,
  'Physical Therapy': 60,
  'Chronic Disease Management': 45,
  'Home Visit - General Checkup': 30,
  'Cardiac Care': 45,
  'default': 45
}

// Zone-based travel times (fallback)
const TRAVEL_TIME = {
  'Keskusta (City Center)': { 'Keskusta (City Center)': 0, 'Raksila': 15, 'Tuira': 20, 'Meri-Oulu': 25, 'Pateniemi': 30, 'Pohjois-Oulu': 25, 'Kontinkangas': 20, 'Kaakkuri': 15, 'Myllyoja': 10 },
  'Raksila': { 'Keskusta (City Center)': 15, 'Raksila': 0, 'Tuira': 10, 'Meri-Oulu': 20, 'Pateniemi': 25, 'Pohjois-Oulu': 20, 'Kontinkangas': 15, 'Kaakkuri': 20, 'Myllyoja': 10 },
  'Tuira': { 'Keskusta (City Center)': 20, 'Raksila': 10, 'Tuira': 0, 'Meri-Oulu': 15, 'Pateniemi': 20, 'Pohjois-Oulu': 15, 'Kontinkangas': 20, 'Kaakkuri': 25, 'Myllyoja': 20 }
}

// Get care duration
function getCareDuration(careNeeded, estimatedCareDuration = null) {
  if (estimatedCareDuration && estimatedCareDuration > 0) {
    return estimatedCareDuration
  }
  return CARE_DURATION[careNeeded] || CARE_DURATION['default']
}

// Get travel time
function getTravelTime(from, to, fromCoords = null, toCoords = null) {
  if (fromCoords?.lat && fromCoords?.lng && toCoords?.lat && toCoords?.lng) {
    return calculateTravelTime(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng)
  }
  if (!from || !to) return 15
  const routeMap = TRAVEL_TIME[from]
  return routeMap ? (routeMap[to] || 20) : 20
}

// Check skill match
function checkSkillMatch(patientCareNeeded, professionalSpecializations) {
  if (!patientCareNeeded || !professionalSpecializations || professionalSpecializations.length === 0) {
    return false
  }

  const careNeededLower = patientCareNeeded.toLowerCase()
  const profSpecs = professionalSpecializations.map(s => s.specialization.toLowerCase())

  if (profSpecs.some(spec => spec === careNeededLower)) return true

  for (const [careType, validSpecs] of Object.entries(CARE_SPECIALTY_MAP)) {
    if (careNeededLower.includes(careType)) {
      const hasValidSpec = validSpecs.some(validSpec => 
        profSpecs.some(profSpec => 
          profSpec.includes(validSpec.toLowerCase()) || validSpec.toLowerCase().includes(profSpec)
        )
      )
      if (hasValidSpec) return true
    }
  }

  return false
}

// Calculate available time slots
async function calculateAvailableTimeSlots(professionalId, visitDate, existingAssignments = []) {
  try {
    const dateObj = new Date(visitDate)
    const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay()

    // Get working hours
    const { data: workingHours, error: whError } = await supabase
      .from('working_hours')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('weekday', dayOfWeek)
      .single()

    if (whError || !workingHours) {
      return { available: false, reason: 'No working hours for this day', patientCountOnDay: 0, maxCapacity: 4 }
    }

    // Get assigned patients from DB
    const { data: assignedPatients, error: assignError } = await supabase
      .from('patient_assignments')
      .select('id, scheduled_visit_date, scheduled_visit_time')
      .eq('professional_id', professionalId)
      .eq('scheduled_visit_date', visitDate)
      .eq('status', 'active')

    if (assignError) {
      return { available: false, reason: 'Error checking capacity', patientCountOnDay: 0, maxCapacity: 4 }
    }

    // Filter memory assignments
    const memoryAssignmentsForDay = existingAssignments.filter(a => 
      a.professional_id === professionalId && a.scheduled_visit_date === visitDate
    )

    const dbCount = assignedPatients ? assignedPatients.length : 0
    const memoryCount = memoryAssignmentsForDay.length
    const currentPatientCountOnDay = dbCount + memoryCount
    const MAX_PATIENTS_PER_DAY = 4

    if (currentPatientCountOnDay >= MAX_PATIENTS_PER_DAY) {
      return {
        available: false,
        reason: `Professional has ${currentPatientCountOnDay}/${MAX_PATIENTS_PER_DAY} patients`,
        patientCountOnDay: currentPatientCountOnDay,
        maxCapacity: MAX_PATIENTS_PER_DAY
      }
    }

    // Parse working hours
    const [startHour, startMin] = workingHours.start_time.split(':').map(Number)
    const [endHour, endMin] = workingHours.end_time.split(':').map(Number)
    const dayStart = startHour * 60 + startMin
    const dayEnd = endHour * 60 + endMin

    // Find available slot (simplified)
    const slotTime = dayStart + (currentPatientCountOnDay * 120) // 2 hours per patient
    
    if (slotTime + 60 > dayEnd) {
      return { available: false, reason: 'No time slots available', patientCountOnDay: currentPatientCountOnDay }
    }

    const hours = Math.floor(slotTime / 60)
    const mins = slotTime % 60
    const suggestedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

    return {
      available: true,
      suggestedTime,
      slots: [suggestedTime],
      patientCountOnDay: currentPatientCountOnDay,
      maxCapacity: MAX_PATIENTS_PER_DAY
    }
  } catch (err) {
    console.error('Error calculating slots:', err)
    return { available: false, reason: err.message }
  }
}

// Smart assign patient
async function smartAssignPatient(patientId, professionalId, date, assignedById = null) {
  try {
    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (patientError) throw patientError

    // Get available slot
    const slots = await calculateAvailableTimeSlots(professionalId, date)
    
    if (!slots.available) {
      return { success: false, error: slots.reason }
    }

    // Create assignment
    const assignmentData = {
      patient_id: patientId,
      professional_id: professionalId,
      assigned_by_id: assignedById,
      scheduled_visit_date: date,
      scheduled_visit_time: slots.suggestedTime,
      status: 'active',
      assignment_date: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('patient_assignments')
      .insert([assignmentData])
      .select()
      .single()

    if (error) throw error

    // Create schedule entry
    await supabase
      .from('schedules')
      .insert([{
        patient_id: patientId,
        professional_id: professionalId,
        date,
        start_time: slots.suggestedTime,
        end_time: addMinutes(slots.suggestedTime, getCareDuration(patient.care_needed, patient.estimated_care_duration)),
        status: 'scheduled'
      }])

    return { success: true, assignment: data, suggestedTime: slots.suggestedTime }
  } catch (err) {
    console.error('Smart assign error:', err)
    return { success: false, error: err.message }
  }
}

// Bulk assign patients
async function bulkAssignPatients(assignments, assignedById) {
  const results = []
  const existingAssignments = []

  for (const assignment of assignments) {
    const result = await smartAssignPatient(
      assignment.patient_id,
      assignment.professional_id,
      assignment.date,
      assignedById
    )
    
    results.push({
      ...assignment,
      ...result
    })

    if (result.success) {
      existingAssignments.push({
        professional_id: assignment.professional_id,
        scheduled_visit_date: assignment.date,
        scheduled_visit_time: result.suggestedTime
      })
    }
  }

  return {
    total: assignments.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}

// Helper: Add minutes to time string
function addMinutes(timeString, minutes) {
  const [h, m] = timeString.split(':').map(Number)
  const totalMins = h * 60 + m + minutes
  const newH = Math.floor(totalMins / 60)
  const newM = totalMins % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

module.exports = {
  calculateAvailableTimeSlots,
  smartAssignPatient,
  bulkAssignPatients,
  getCareDuration,
  getTravelTime,
  checkSkillMatch,
  CARE_SPECIALTY_MAP,
  CARE_DURATION
}

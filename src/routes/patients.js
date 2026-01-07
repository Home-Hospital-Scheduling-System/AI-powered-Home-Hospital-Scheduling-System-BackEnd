const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { verifyToken, requireRole } = require('../middleware/auth')
const { geocodeAddress } = require('../services/geoUtils')

// Get all patients (coordinator/supervisor only)
router.get('/', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get unassigned patients
router.get('/unassigned', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    // Get patients who don't have active assignments
    const { data: assignedPatientIds, error: assignError } = await supabase
      .from('patient_assignments')
      .select('patient_id')
      .eq('status', 'active')

    if (assignError) throw assignError

    const assignedIds = assignedPatientIds.map(a => a.patient_id)

    let query = supabase
      .from('patients')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone)
      `)

    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.join(',')})`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single patient
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone)
      `)
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create patient
router.post('/', verifyToken, requireRole(['coordinator', 'professional']), async (req, res) => {
  try {
    const patientData = { ...req.body }

    // Geocode address if provided
    if (patientData.address) {
      const coords = await geocodeAddress(patientData.address)
      if (coords) {
        patientData.latitude = coords.lat
        patientData.longitude = coords.lng
      }
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update patient
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const patientData = { ...req.body, updated_at: new Date().toISOString() }

    // Re-geocode if address changed
    if (patientData.address) {
      const coords = await geocodeAddress(patientData.address)
      if (coords) {
        patientData.latitude = coords.lat
        patientData.longitude = coords.lng
      }
    }

    const { data, error } = await supabase
      .from('patients')
      .update(patientData)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete patient
router.delete('/:id', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Patient deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

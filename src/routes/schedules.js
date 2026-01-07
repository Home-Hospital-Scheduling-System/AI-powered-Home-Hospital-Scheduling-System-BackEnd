const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { verifyToken, requireRole } = require('../middleware/auth')
const { calculateAvailableTimeSlots, smartAssignPatient } = require('../services/timeSlotOptimizer')

// Get schedules for a date range
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, professional_id } = req.query

    let query = supabase
      .from('schedules')
      .select(`
        *,
        patients (id, name, address, area, care_needed, latitude, longitude),
        professionals (id, kind, specialty, profile_id, profiles:profile_id (full_name))
      `)

    if (start_date) {
      query = query.gte('date', start_date)
    }
    if (end_date) {
      query = query.lte('date', end_date)
    }
    if (professional_id) {
      query = query.eq('professional_id', professional_id)
    }

    const { data, error } = await query.order('date', { ascending: true }).order('start_time', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get available time slots for a professional on a date
router.get('/available-slots', verifyToken, async (req, res) => {
  try {
    const { professional_id, date } = req.query

    if (!professional_id || !date) {
      return res.status(400).json({ error: 'professional_id and date are required' })
    }

    const slots = await calculateAvailableTimeSlots(professional_id, date)
    res.json(slots)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Smart assign patient to professional
router.post('/smart-assign', verifyToken, requireRole(['coordinator']), async (req, res) => {
  try {
    const { patient_id, professional_id, date } = req.body

    if (!patient_id || !professional_id || !date) {
      return res.status(400).json({ error: 'patient_id, professional_id, and date are required' })
    }

    const result = await smartAssignPatient(patient_id, professional_id, date)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create schedule entry
router.post('/', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const scheduleData = { ...req.body }

    const { data, error } = await supabase
      .from('schedules')
      .insert([scheduleData])
      .select(`
        *,
        patients (id, name, address, area),
        professionals (id, kind, specialty, profile_id)
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update schedule entry
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete schedule entry
router.delete('/:id', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Schedule deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get professional's schedule for a specific date
router.get('/professional/:professionalId/date/:date', verifyToken, async (req, res) => {
  try {
    const { professionalId, date } = req.params

    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        patients (id, name, address, area, care_needed, phone)
      `)
      .eq('professional_id', professionalId)
      .eq('date', date)
      .order('start_time', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

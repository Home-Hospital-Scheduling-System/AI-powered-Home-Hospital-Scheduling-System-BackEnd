const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { verifyToken, requireRole } = require('../middleware/auth')
const { smartAssignPatient, bulkAssignPatients } = require('../services/timeSlotOptimizer')

// Get all assignments
router.get('/', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const { status } = req.query

    let query = supabase
      .from('patient_assignments')
      .select(`
        *,
        patients (id, name, address, area, care_needed),
        professionals (id, kind, specialty, profile_id, profiles:profile_id (full_name))
      `)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get assignments for a specific professional
router.get('/professional/:professionalId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patient_assignments')
      .select(`
        *,
        patients (id, name, address, area, care_needed, phone, medical_notes)
      `)
      .eq('professional_id', req.params.professionalId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Smart assign single patient
router.post('/smart-assign', verifyToken, requireRole(['coordinator']), async (req, res) => {
  try {
    const { patient_id, professional_id, date, assigned_by_id } = req.body

    if (!patient_id || !professional_id || !date) {
      return res.status(400).json({ error: 'patient_id, professional_id, and date are required' })
    }

    const result = await smartAssignPatient(patient_id, professional_id, date, assigned_by_id || req.user.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk assign patients
router.post('/bulk-assign', verifyToken, requireRole(['coordinator']), async (req, res) => {
  try {
    const { assignments } = req.body
    // assignments = [{ patient_id, professional_id, date }, ...]

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array is required' })
    }

    const results = await bulkAssignPatients(assignments, req.user.id)
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create manual assignment
router.post('/', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const assignmentData = {
      ...req.body,
      assigned_by_id: req.user.id,
      assignment_date: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('patient_assignments')
      .insert([assignmentData])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update assignment status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body

    if (!['active', 'completed', 'reassigned', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const { data, error } = await supabase
      .from('patient_assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Reassign patient to different professional
router.post('/:id/reassign', verifyToken, requireRole(['coordinator']), async (req, res) => {
  try {
    const { new_professional_id, reason } = req.body
    const oldAssignmentId = req.params.id

    // Update old assignment status
    await supabase
      .from('patient_assignments')
      .update({ status: 'reassigned', updated_at: new Date().toISOString() })
      .eq('id', oldAssignmentId)

    // Get old assignment details
    const { data: oldAssignment, error: fetchError } = await supabase
      .from('patient_assignments')
      .select('*')
      .eq('id', oldAssignmentId)
      .single()

    if (fetchError) throw fetchError

    // Create new assignment
    const { data, error } = await supabase
      .from('patient_assignments')
      .insert([{
        patient_id: oldAssignment.patient_id,
        professional_id: new_professional_id,
        assigned_by_id: req.user.id,
        assignment_reason: reason || 'Reassignment',
        status: 'active',
        assignment_date: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete assignment
router.delete('/:id', verifyToken, requireRole(['coordinator', 'supervisor']), async (req, res) => {
  try {
    const { error } = await supabase
      .from('patient_assignments')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Assignment deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { verifyToken, requireRole } = require('../middleware/auth')

// Get all professionals
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone)
      `)
      .order('kind', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get professionals by skill/specialty
router.get('/by-skill/:skill', verifyToken, async (req, res) => {
  try {
    const { skill } = req.params

    // Get professionals with matching specialization
    const { data: specializations, error: specError } = await supabase
      .from('professional_specializations')
      .select('professional_id')
      .eq('specialization', skill)

    if (specError) throw specError

    const professionalIds = specializations.map(s => s.professional_id)

    if (professionalIds.length === 0) {
      return res.json([])
    }

    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone),
        professional_specializations (specialization, years_experience),
        professional_service_areas (service_area, is_primary)
      `)
      .in('id', professionalIds)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get professionals by service area
router.get('/by-area/:area', verifyToken, async (req, res) => {
  try {
    const { area } = req.params

    const { data: serviceAreas, error: areaError } = await supabase
      .from('professional_service_areas')
      .select('professional_id')
      .eq('service_area', area)

    if (areaError) throw areaError

    const professionalIds = serviceAreas.map(s => s.professional_id)

    if (professionalIds.length === 0) {
      return res.json([])
    }

    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone),
        professional_specializations (specialization, years_experience),
        professional_service_areas (service_area, is_primary)
      `)
      .in('id', professionalIds)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single professional by profile_id (UUID)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        profiles:profile_id (full_name, email, phone),
        professional_specializations (specialization, years_experience),
        professional_service_areas (service_area, is_primary),
        working_hours (weekday, start_time, end_time)
      `)
      .eq('profile_id', req.params.id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get professional's working hours by profile_id (UUID)
router.get('/:id/working-hours', verifyToken, async (req, res) => {
  try {
    // First get the professional's integer ID from profile_id (UUID)
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('id')
      .eq('profile_id', req.params.id)
      .single()

    if (profError) throw profError
    if (!professional) return res.status(404).json({ error: 'Professional not found' })

    const { data, error } = await supabase
      .from('working_hours')
      .select('*')
      .eq('professional_id', professional.id)
      .order('weekday', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update professional's working hours by profile_id (UUID)
router.put('/:id/working-hours', verifyToken, async (req, res) => {
  try {
    const { working_hours } = req.body

    // First get the professional's integer ID from profile_id (UUID)
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('id')
      .eq('profile_id', req.params.id)
      .single()

    if (profError) throw profError
    if (!professional) return res.status(404).json({ error: 'Professional not found' })

    // Delete existing working hours
    await supabase
      .from('working_hours')
      .delete()
      .eq('professional_id', professional.id)

    // Insert new working hours
    const hoursWithProfId = working_hours.map(h => ({
      ...h,
      professional_id: professional.id
    }))

    const { data, error } = await supabase
      .from('working_hours')
      .insert(hoursWithProfId)
      .select()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

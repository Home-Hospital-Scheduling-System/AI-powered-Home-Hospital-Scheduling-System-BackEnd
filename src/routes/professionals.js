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

// List all unique specializations
router.get('/specializations', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('professional_specializations')
      .select('specialization')

    if (error) throw error

    const unique = [...new Set((data || []).map(row => row.specialization).filter(Boolean))]
    res.json(unique)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk working hours by profile_id (UUIDs)
router.get('/working-hours/bulk', verifyToken, async (req, res) => {
  try {
    const raw = req.query.profile_ids || ''
    const profileIds = raw.split(',').map(s => s.trim()).filter(Boolean)

    if (profileIds.length === 0) {
      return res.status(400).json({ error: 'profile_ids query param is required' })
    }

    // Map profile_id UUIDs -> professional integer ids
    const { data: pros, error: prosError } = await supabase
      .from('professionals')
      .select('id, profile_id')
      .in('profile_id', profileIds)

    if (prosError) throw prosError

    const proIdByProfileId = {}
    const profileIdByProId = {}
    for (const p of pros || []) {
      proIdByProfileId[p.profile_id] = p.id
      profileIdByProId[p.id] = p.profile_id
    }

    const proIds = Object.keys(profileIdByProId).map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id))

    if (proIds.length === 0) {
      return res.json({})
    }

    const { data: hours, error: hoursError } = await supabase
      .from('working_hours')
      .select('*')
      .in('professional_id', proIds)
      .order('weekday', { ascending: true })

    if (hoursError) throw hoursError

    const grouped = {}
    for (const h of hours || []) {
      const profileId = profileIdByProId[h.professional_id]
      if (!grouped[profileId]) grouped[profileId] = []
      grouped[profileId].push(h)
    }

    res.json(grouped)
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

// Helper to resolve professional.id from either profile_id (UUID) or numeric id
async function resolveProfessionalId(idParam) {
  const isUuid = typeof idParam === 'string' && idParam.includes('-') && idParam.length >= 32

  const query = supabase
    .from('professionals')
    .select('id')
    .limit(1)

  if (isUuid) {
    query.eq('profile_id', idParam)
  } else {
    // Fallback: treat as integer primary key
    const intId = parseInt(idParam, 10)
    if (Number.isNaN(intId)) return { error: new Error('Invalid professional identifier') }
    query.eq('id', intId)
  }

  const { data, error } = await query.single()
  return { data, error }
}

// Get professional's working hours (accepts profile_id UUID or professional integer id)
router.get('/:id/working-hours', verifyToken, async (req, res) => {
  try {
    const { data: professional, error: profError } = await resolveProfessionalId(req.params.id)

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

// Update professional's working hours (accepts profile_id UUID or professional integer id)
router.put('/:id/working-hours', verifyToken, async (req, res) => {
  try {
    const { working_hours } = req.body

    if (!Array.isArray(working_hours)) {
      return res.status(400).json({ error: 'working_hours must be an array' })
    }

    const { data: professional, error: profError } = await resolveProfessionalId(req.params.id)

    if (profError) throw profError
    if (!professional) return res.status(404).json({ error: 'Professional not found' })

    // Upsert working hours: update existing by id, insert new ones, keep others intact
    if (working_hours.length > 0) {
      const hoursWithProfId = working_hours.map(h => ({
        ...h,
        professional_id: professional.id
      }))

      const { error: upsertError } = await supabase
        .from('working_hours')
        .upsert(hoursWithProfId, { onConflict: 'id' })

      if (upsertError) throw upsertError
    }

    res.json({ message: 'Working hours saved' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete a single working hour (accepts profile_id UUID or professional integer id)
router.delete('/:id/working-hours/:workingHourId', verifyToken, async (req, res) => {
  try {
    const { workingHourId } = req.params
    const { data: professional, error: profError } = await resolveProfessionalId(req.params.id)

    if (profError) throw profError
    if (!professional) return res.status(404).json({ error: 'Professional not found' })

    const whId = parseInt(workingHourId, 10)
    if (Number.isNaN(whId)) return res.status(400).json({ error: 'Invalid working hour id' })

    const { error: deleteError } = await supabase
      .from('working_hours')
      .delete()
      .eq('id', whId)
      .eq('professional_id', professional.id)

    if (deleteError) throw deleteError

    res.json({ message: 'Working hour deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

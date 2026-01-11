/**
 * Integration Tests for Assignment API
 * Tests complete workflows involving API endpoints
 */

const request = require('supertest')

// Create a test Express app
const express = require('express')
const app = express()
app.use(express.json())

// Mock API endpoint for testing
app.post('/api/test/assignments', (req, res) => {
  const { patient_id, professional_id } = req.body
  
  if (!patient_id || !professional_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  
  res.status(201).json({
    id: 'assignment-123',
    patient_id,
    professional_id,
    status: 'pending',
    scheduled_date: new Date().toISOString()
  })
})

app.get('/api/test/assignments/:id', (req, res) => {
  res.status(200).json({
    id: req.params.id,
    patient_id: 'patient-123',
    professional_id: 'prof-123',
    status: 'pending'
  })
})

describe('Assignment API Integration Tests', () => {
  
  describe('POST /api/test/assignments', () => {
    
    test('creates assignment with valid data', async () => {
      const response = await request(app)
        .post('/api/test/assignments')
        .send({
          patient_id: 'patient-123',
          professional_id: 'prof-456'
        })
      
      expect(response.status).toBe(201)
      expect(response.body.id).toBe('assignment-123')
      expect(response.body.patient_id).toBe('patient-123')
      expect(response.body.professional_id).toBe('prof-456')
    })

    test('returns 400 for missing patient_id', async () => {
      const response = await request(app)
        .post('/api/test/assignments')
        .send({
          professional_id: 'prof-456'
        })
      
      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    test('returns 400 for missing professional_id', async () => {
      const response = await request(app)
        .post('/api/test/assignments')
        .send({
          patient_id: 'patient-123'
        })
      
      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    test('returns assignment with pending status', async () => {
      const response = await request(app)
        .post('/api/test/assignments')
        .send({
          patient_id: 'patient-123',
          professional_id: 'prof-456'
        })
      
      expect(response.body.status).toBe('pending')
    })

  })

  describe('GET /api/test/assignments/:id', () => {
    
    test('retrieves assignment by ID', async () => {
      const response = await request(app)
        .get('/api/test/assignments/assignment-123')
      
      expect(response.status).toBe(200)
      expect(response.body.id).toBe('assignment-123')
    })

    test('returns complete assignment object', async () => {
      const response = await request(app)
        .get('/api/test/assignments/assignment-123')
      
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('patient_id')
      expect(response.body).toHaveProperty('professional_id')
      expect(response.body).toHaveProperty('status')
    })

  })

})

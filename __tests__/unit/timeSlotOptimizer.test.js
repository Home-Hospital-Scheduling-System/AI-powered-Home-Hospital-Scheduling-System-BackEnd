/**
 * Unit Tests for timeSlotOptimizer.js
 * Tests scheduling logic, skill matching, and workload balancing
 */

const {
  checkSkillMatch,
  getCareDuration
} = require('../../src/services/timeSlotOptimizer')

describe('Time Slot Optimizer', () => {
  
  describe('checkSkillMatch', () => {
    
    test('returns true for exact specialization match', () => {
      const patient = 'wound care'
      const professional = [
        { specialization: 'Wound Care' }
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

    test('returns true for related specialization', () => {
      const patient = 'wound dressing'
      const professional = [
        { specialization: 'Post-operative Care' }
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

    test('returns true when specialization is in valid list for care type', () => {
      const patient = 'wound care'
      const professional = [
        { specialization: 'Nursing Care' } // Valid for wound care
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

    test('returns false for non-matching specialization', () => {
      const patient = 'wound care'
      const professional = [
        { specialization: 'Cardiology' } // Not valid for wound care
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(false)
    })

    test('returns false for empty specializations', () => {
      const patient = 'wound care'
      const professional = []
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(false)
    })

    test('returns false for null patient care', () => {
      const professional = [
        { specialization: 'Wound Care' }
      ]
      const match = checkSkillMatch(null, professional)
      expect(match).toBe(false)
    })

    test('returns false for null professional specializations', () => {
      const patient = 'wound care'
      const match = checkSkillMatch(patient, null)
      expect(match).toBe(false)
    })

    test('handles case-insensitive matching', () => {
      const patient = 'WOUND CARE'
      const professional = [
        { specialization: 'wound care' }
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

    test('matches medication administration with multiple valid specs', () => {
      const patient = 'medication administration'
      const professional = [
        { specialization: 'Medication Management' }
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

    test('matches physical therapy with related specialization', () => {
      const patient = 'physical therapy'
      const professional = [
        { specialization: 'Rehabilitation' }
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

    test('matches multiple care types with professional', () => {
      const patient = 'elderly care'
      const professional = [
        { specialization: 'Elderly Care' },
        { specialization: 'Home Health Aide' }
      ]
      const match = checkSkillMatch(patient, professional)
      expect(match).toBe(true)
    })

  })

  describe('getCareDuration', () => {
    
    test('returns estimated duration when provided', () => {
      const duration = getCareDuration('Wound Care', 90)
      expect(duration).toBe(90)
    })

    test('returns default duration for standard care type', () => {
      const duration = getCareDuration('Wound Dressing')
      expect(duration).toBe(45)
    })

    test('returns duration for medication administration', () => {
      const duration = getCareDuration('Medication Administration')
      expect(duration).toBe(30)
    })

    test('returns duration for physical therapy', () => {
      const duration = getCareDuration('Physical Therapy')
      expect(duration).toBe(60)
    })

    test('returns default duration for unknown care type', () => {
      const duration = getCareDuration('Unknown Care Type')
      expect(duration).toBe(45)
    })

    test('uses estimated duration over standard', () => {
      const duration = getCareDuration('Wound Care', 120)
      expect(duration).toBe(120) // Estimated takes precedence
    })

    test('ignores zero or negative estimated durations', () => {
      const duration = getCareDuration('Wound Care', 0)
      expect(duration).toBe(45)
    })

    test('returns consistent duration for same care type', () => {
      const duration1 = getCareDuration('Palliative Care')
      const duration2 = getCareDuration('Palliative Care')
      expect(duration1).toBe(duration2)
    })

  })

})

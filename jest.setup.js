/**
 * Jest Setup File
 * Mocks environment variables and external dependencies
 */

// Mock Supabase environment variables
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key'
process.env.NODE_ENV = 'test'

// Mock the Supabase module before any tests import it
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'test-id' }],
        error: null
      }),
      update: jest.fn().mockResolvedValue({
        data: { id: 'test-id' },
        error: null
      })
    })
  }))
}))

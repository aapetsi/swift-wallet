/**
 * Jest setup file that runs after the test framework is installed
 */

const { setupTestDatabase, closeTestDatabase } = require('./testDatabase')

// Extend Jest matchers for better assertions
expect.extend({
  toBeValidTransactionHash(received) {
    const pass = typeof received === 'string' && 
                 received.startsWith('0x') && 
                 received.length === 66
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid transaction hash`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid transaction hash (0x followed by 64 hex characters)`,
        pass: false
      }
    }
  },
  
  toBeValidChain(received) {
    const validChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana']
    const pass = validChains.includes(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid chain`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be one of: ${validChains.join(', ')}`,
        pass: false
      }
    }
  },
  
  toBePositiveNumber(received) {
    const pass = typeof received === 'number' && received > 0 && isFinite(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a positive number`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be a positive number`,
        pass: false
      }
    }
  },
  
  toHaveValidErrorStructure(received) {
    const pass = received && 
                 typeof received.error === 'string' &&
                 received.error.length > 0
    
    if (pass) {
      return {
        message: () => `expected response not to have valid error structure`,
        pass: true
      }
    } else {
      return {
        message: () => `expected response to have error structure with non-empty error message`,
        pass: false
      }
    }
  },
  
  toHaveBalanceConservation(received, expected) {
    const tolerance = 0.001 // Allow for floating point precision issues
    const pass = Math.abs(received - expected) <= tolerance
    
    if (pass) {
      return {
        message: () => `expected balance ${received} not to equal ${expected} (within tolerance)`,
        pass: true
      }
    } else {
      return {
        message: () => `expected balance ${received} to equal ${expected} (within tolerance of ${tolerance})`,
        pass: false
      }
    }
  },
  
  toHaveValidApiResponse(received) {
    const hasRequiredFields = received && 
                             typeof received === 'object' &&
                             !Array.isArray(received)
    
    if (hasRequiredFields) {
      return {
        message: () => `expected response not to have valid API structure`,
        pass: true
      }
    } else {
      return {
        message: () => `expected response to be a valid object with required fields`,
        pass: false
      }
    }
  },
  
  toBeWithinRange(received, min, max) {
    const pass = typeof received === 'number' && 
                 received >= min && 
                 received <= max &&
                 isFinite(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${min}-${max}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be within range ${min}-${max}`,
        pass: false
      }
    }
  }
})

// Global test configuration
jest.setTimeout(10000)

// Suppress console.log during tests unless explicitly needed
const originalConsoleLog = console.log
const originalConsoleError = console.error

beforeAll(() => {
  if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
    console.log = jest.fn()
    console.error = jest.fn()
  }
})

afterAll(() => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
})
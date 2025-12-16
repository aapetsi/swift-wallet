/**
 * Centralized test configuration and constants
 * Provides consistent configuration across all test files
 */

/**
 * Test environment configuration
 */
const TEST_CONFIG = {
  // Database configuration
  database: {
    resetBetweenTests: true,
    validateIntegrity: true,
    seedData: true
  },
  
  // Property-based testing configuration
  propertyTesting: {
    numRuns: 100,
    timeout: 30000,
    verbose: process.env.VERBOSE_TESTS === 'true',
    shrinkOnFailure: true
  },
  
  // API testing configuration
  api: {
    timeout: 5000,
    retries: 0,
    validateResponses: true
  },
  
  // Performance testing thresholds
  performance: {
    maxResponseTime: 1000, // 1 second
    maxDatabaseQueryTime: 500, // 500ms
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB
  },
  
  // Coverage requirements
  coverage: {
    lines: 100,
    functions: 100,
    branches: 95,
    statements: 100
  }
}

/**
 * Test data constants
 */
const TEST_CONSTANTS = {
  // Valid chains supported by the system
  VALID_CHAINS: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'],
  
  // Test user IDs
  TEST_USERS: {
    USER1: 'user1',
    USER2: 'user2',
    USER3: 'user3',
    INVALID: 'invalid-user',
    EMPTY: '',
    LONG: 'user-with-very-long-id-that-might-cause-database-issues'
  },
  
  // Amount boundaries for testing
  AMOUNTS: {
    ZERO: 0,
    NEGATIVE: -100,
    SMALL: 0.01,
    NORMAL: 100,
    LARGE: 10000,
    VERY_LARGE: Number.MAX_SAFE_INTEGER
  },
  
  // Transaction statuses
  TRANSACTION_STATUSES: ['pending', 'confirmed', 'failed'],
  
  // Transaction types
  TRANSACTION_TYPES: ['transfer', 'bridge'],
  
  // Error codes and messages
  ERRORS: {
    USER_NOT_FOUND: 'User not found',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    INVALID_AMOUNT: 'Invalid amount',
    INVALID_CHAIN: 'Invalid chain',
    DATABASE_ERROR: 'Database error'
  }
}

/**
 * Test utilities for common operations
 */
const TEST_UTILITIES = {
  /**
   * Generates a unique test ID
   */
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substring(2)}`,
  
  /**
   * Creates a delay for testing async operations
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Rounds number to avoid floating point precision issues
   */
  roundToDecimal: (num, decimals = 2) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
  
  /**
   * Checks if two numbers are approximately equal
   */
  approximatelyEqual: (a, b, tolerance = 0.001) => Math.abs(a - b) <= tolerance,
  
  /**
   * Validates transaction hash format
   */
  isValidTxHash: (hash) => typeof hash === 'string' && hash.startsWith('0x') && hash.length === 66,
  
  /**
   * Validates chain name
   */
  isValidChain: (chain) => TEST_CONSTANTS.VALID_CHAINS.includes(chain),
  
  /**
   * Creates a mock transaction hash
   */
  createMockTxHash: () => `0x${'0'.repeat(64)}`,
  
  /**
   * Validates API response structure
   */
  validateApiResponse: (response, requiredFields = []) => {
    if (!response || typeof response !== 'object') return false
    return requiredFields.every(field => response.hasOwnProperty(field))
  }
}

/**
 * Common test patterns and templates
 */
const TEST_PATTERNS = {
  /**
   * Standard error test pattern
   */
  errorTest: (operation, expectedError) => async () => {
    await expect(operation()).rejects.toThrow(expectedError)
  },
  
  /**
   * Standard success test pattern
   */
  successTest: (operation, validator) => async () => {
    const result = await operation()
    expect(validator(result)).toBe(true)
  },
  
  /**
   * Balance conservation test pattern
   */
  balanceConservationTest: (operation, getBalance, expectedChange) => async () => {
    const initialBalance = await getBalance()
    await operation()
    const finalBalance = await getBalance()
    const actualChange = finalBalance - initialBalance
    expect(TEST_UTILITIES.approximatelyEqual(actualChange, expectedChange)).toBe(true)
  }
}

module.exports = {
  TEST_CONFIG,
  TEST_CONSTANTS,
  TEST_UTILITIES,
  TEST_PATTERNS
}
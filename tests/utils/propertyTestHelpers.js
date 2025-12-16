/**
 * Property-based testing utilities and helpers
 * Provides common patterns and utilities for property tests
 */

const fc = require('fast-check')

/**
 * Configuration for property-based tests
 */
const PROPERTY_TEST_CONFIG = {
  numRuns: 100, // Minimum iterations as specified in design
  timeout: 30000, // 30 second timeout for property tests
  verbose: process.env.VERBOSE_TESTS === 'true'
}

/**
 * Wrapper for property-based tests with consistent configuration
 * @param {string} testName - Name of the test
 * @param {Object} arbitrary - Fast-check arbitrary generator
 * @param {Function} property - Property function to test
 * @param {Object} options - Additional options
 */
const propertyTest = (testName, arbitrary, property, options = {}) => {
  const config = { ...PROPERTY_TEST_CONFIG, ...options }
  
  test(testName, async () => {
    await fc.assert(
      fc.asyncProperty(arbitrary, property),
      {
        numRuns: config.numRuns,
        timeout: config.timeout,
        verbose: config.verbose
      }
    )
  }, config.timeout + 5000) // Add buffer to Jest timeout
}

/**
 * Creates a property test with database isolation
 * @param {string} testName - Name of the test
 * @param {Object} arbitrary - Fast-check arbitrary generator
 * @param {Function} property - Property function to test
 * @param {Object} options - Additional options
 */
const isolatedPropertyTest = (testName, arbitrary, property, options = {}) => {
  const { resetTestDatabase } = require('./testDatabase')
  
  propertyTest(testName, arbitrary, async (input) => {
    await resetTestDatabase()
    return await property(input)
  }, options)
}

/**
 * Helper for testing balance conservation properties
 * @param {Function} operation - Operation that should conserve balance
 * @param {Function} getInitialBalance - Function to get initial balance
 * @param {Function} getFinalBalance - Function to get final balance
 * @param {Function} getExpectedChange - Function to calculate expected change
 */
const balanceConservationProperty = (operation, getInitialBalance, getFinalBalance, getExpectedChange) => {
  return async (input) => {
    const initialBalance = await getInitialBalance(input)
    await operation(input)
    const finalBalance = await getFinalBalance(input)
    const expectedChange = await getExpectedChange(input)
    
    const actualChange = finalBalance - initialBalance
    const tolerance = 0.001 // Account for floating point precision
    
    return Math.abs(actualChange - expectedChange) <= tolerance
  }
}

/**
 * Helper for testing error handling properties
 * @param {Function} operation - Operation that should handle errors
 * @param {Function} shouldFail - Function to determine if operation should fail
 */
const errorHandlingProperty = (operation, shouldFail) => {
  return async (input) => {
    const expectFailure = await shouldFail(input)
    
    try {
      await operation(input)
      return !expectFailure // Should succeed if we don't expect failure
    } catch (error) {
      return expectFailure // Should fail if we expect failure
    }
  }
}

/**
 * Helper for testing idempotent operations
 * @param {Function} operation - Operation that should be idempotent
 * @param {Function} getState - Function to get current state
 */
const idempotencyProperty = (operation, getState) => {
  return async (input) => {
    await operation(input)
    const stateAfterFirst = await getState(input)
    
    await operation(input)
    const stateAfterSecond = await getState(input)
    
    return JSON.stringify(stateAfterFirst) === JSON.stringify(stateAfterSecond)
  }
}

/**
 * Helper for testing round-trip properties (serialize/deserialize, encode/decode)
 * @param {Function} forward - Forward operation (e.g., serialize)
 * @param {Function} backward - Backward operation (e.g., deserialize)
 */
const roundTripProperty = (forward, backward) => {
  return async (input) => {
    try {
      const intermediate = await forward(input)
      const result = await backward(intermediate)
      return JSON.stringify(input) === JSON.stringify(result)
    } catch (error) {
      // Round trip should not throw for valid inputs
      return false
    }
  }
}

/**
 * Helper for testing invariant properties
 * @param {Function} operation - Operation to perform
 * @param {Function} invariant - Invariant that should hold before and after
 */
const invariantProperty = (operation, invariant) => {
  return async (input) => {
    const beforeInvariant = await invariant(input)
    if (!beforeInvariant) return false // Invariant must hold before operation
    
    await operation(input)
    
    const afterInvariant = await invariant(input)
    return afterInvariant
  }
}

/**
 * Creates generators for edge cases
 */
const edgeCaseGenerators = {
  // Generate edge case amounts (very small, very large, zero, negative)
  edgeAmounts: fc.oneof(
    fc.constant(0),
    fc.constant(-1),
    fc.constant(0.001),
    fc.constant(Number.MAX_SAFE_INTEGER),
    fc.constant(Number.MIN_SAFE_INTEGER),
    fc.float({ min: Math.fround(-1000), max: Math.fround(-0.001) }),
    fc.float({ min: Math.fround(100000), max: Math.fround(1000000) })
  ),
  
  // Generate problematic strings
  edgeStrings: fc.oneof(
    fc.constant(''),
    fc.constant(' '),
    fc.constant('\n\t'),
    fc.constant('null'),
    fc.constant('undefined'),
    fc.string({ minLength: 1000, maxLength: 2000 }), // Very long strings
    fc.unicodeString({ minLength: 1, maxLength: 50 }) // Unicode characters
  ),
  
  // Generate boundary user IDs
  edgeUserIds: fc.oneof(
    fc.constant(''),
    fc.constant(' '),
    fc.constant('user-with-very-long-id-that-might-cause-issues-in-database-operations'),
    fc.string({ minLength: 1, maxLength: 3 }),
    fc.unicodeString({ minLength: 1, maxLength: 20 })
  )
}

module.exports = {
  PROPERTY_TEST_CONFIG,
  propertyTest,
  isolatedPropertyTest,
  balanceConservationProperty,
  errorHandlingProperty,
  idempotencyProperty,
  roundTripProperty,
  invariantProperty,
  edgeCaseGenerators
}
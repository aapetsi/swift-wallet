/**
 * Test data factories for generating consistent test data
 * Enhanced with fast-check generators for property-based testing
 */

const crypto = require('crypto')
const fc = require('fast-check')

/**
 * Creates a test user with default or custom properties
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Test user object
 */
const createTestUser = (overrides = {}) => {
  const defaultUser = {
    id: `test-user-${Math.random().toString(36).substring(2, 15)}`,
    balances: {
      ethereum: 1000,
      polygon: 500,
      arbitrum: 750,
      optimism: 250,
      solana: 2000
    }
  }
  
  return {
    ...defaultUser,
    ...overrides,
    balances: {
      ...defaultUser.balances,
      ...(overrides.balances || {})
    }
  }
}

/**
 * Creates a test transaction with default or custom properties
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Test transaction object
 */
const createTestTransaction = (overrides = {}) => {
  const defaultTransaction = {
    txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    type: 'transfer',
    amount: 100,
    gasCost: 5,
    status: 'confirmed',
    fromUserId: 'user1',
    toUserId: 'user2',
    chain: 'ethereum',
    timestamp: new Date()
  }
  
  return {
    ...defaultTransaction,
    ...overrides
  }
}

/**
 * Creates a test bridge operation with default or custom properties
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Test bridge operation object
 */
const createTestBridgeOperation = (overrides = {}) => {
  const defaultBridge = {
    fromChain: 'ethereum',
    toChain: 'polygon',
    amount: 100,
    cost: 10,
    userId: 'user1'
  }
  
  return {
    ...defaultBridge,
    ...overrides
  }
}

/**
 * Creates multiple test users with sequential IDs
 * @param {number} count - Number of users to create
 * @param {Object} baseOverrides - Base properties for all users
 * @returns {Array} Array of test user objects
 */
const createTestUsers = (count, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestUser({
      ...baseOverrides,
      id: `test-user-${index + 1}`
    })
  )
}

/**
 * Creates test balance data for a user across all chains
 * @param {string} userId - User ID
 * @param {Object} balanceOverrides - Chain-specific balance overrides
 * @returns {Array} Array of balance objects
 */
const createTestBalances = (userId, balanceOverrides = {}) => {
  const defaultBalances = {
    ethereum: 1000,
    polygon: 500,
    arbitrum: 750,
    optimism: 250,
    solana: 2000
  }
  
  const balances = { ...defaultBalances, ...balanceOverrides }
  
  return Object.entries(balances).map(([chain, amount]) => ({
    userId,
    chain,
    amount
  }))
}

/**
 * Generates random valid chain names
 * @returns {string} Random chain name
 */
const getRandomChain = () => {
  const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana']
  return chains[Math.floor(Math.random() * chains.length)]
}

/**
 * Generates random valid amount within reasonable bounds
 * @param {number} min - Minimum amount (default: 1)
 * @param {number} max - Maximum amount (default: 10000)
 * @returns {number} Random amount
 */
const getRandomAmount = (min = 1, max = 10000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Fast-check generators for property-based testing

/**
 * Fast-check generator for valid chain names
 */
const chainArbitrary = fc.constantFrom('ethereum', 'polygon', 'arbitrum', 'optimism', 'solana')

/**
 * Fast-check generator for valid user IDs
 */
const userIdArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

/**
 * Fast-check generator for valid amounts (positive numbers)
 */
const amountArbitrary = fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true })

/**
 * Fast-check generator for valid transaction hashes
 */
const txHashArbitrary = fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 32, maxLength: 32 })
  .map(bytes => `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}`)

/**
 * Fast-check generator for test users with balances
 */
const testUserArbitrary = fc.record({
  id: userIdArbitrary,
  balances: fc.record({
    ethereum: amountArbitrary,
    polygon: amountArbitrary,
    arbitrum: amountArbitrary,
    optimism: amountArbitrary,
    solana: amountArbitrary
  })
})

/**
 * Fast-check generator for test transactions
 */
const testTransactionArbitrary = fc.record({
  txHash: txHashArbitrary,
  type: fc.constantFrom('transfer', 'bridge'),
  amount: amountArbitrary,
  gasCost: fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
  status: fc.constantFrom('pending', 'confirmed', 'failed'),
  fromUserId: userIdArbitrary,
  toUserId: userIdArbitrary,
  chain: chainArbitrary
})

/**
 * Fast-check generator for bridge operations
 */
const bridgeOperationArbitrary = fc.record({
  fromChain: chainArbitrary,
  toChain: chainArbitrary,
  amount: amountArbitrary,
  cost: fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true }),
  userId: userIdArbitrary
}).filter(bridge => bridge.fromChain !== bridge.toChain)

/**
 * Fast-check generator for API request bodies
 */
const apiRequestArbitrary = fc.record({
  to: userIdArbitrary,
  from: userIdArbitrary,
  amount: amountArbitrary
}).filter(req => req.to !== req.from)

module.exports = {
  createTestUser,
  createTestTransaction,
  createTestBridgeOperation,
  createTestUsers,
  createTestBalances,
  getRandomChain,
  getRandomAmount,
  // Fast-check generators
  chainArbitrary,
  userIdArbitrary,
  amountArbitrary,
  txHashArbitrary,
  testUserArbitrary,
  testTransactionArbitrary,
  bridgeOperationArbitrary,
  apiRequestArbitrary
}
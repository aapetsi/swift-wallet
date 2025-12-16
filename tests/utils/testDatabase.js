/**
 * Test database utilities for setup, cleanup, and isolation
 */

const crypto = require('crypto')
const sequelize = require('../../database/sequelize')
const initializeDatabase = require('../../database/initializeDatabase')
const User = require('../../database/models/User')
const Balance = require('../../database/models/Balance')
const Transaction = require('../../database/models/Transaction')

/**
 * Sets up test database with clean state
 * @returns {Promise<void>}
 */
const setupTestDatabase = async () => {
  try {
    // Initialize database structure
    await initializeDatabase()
    
    // Clear all existing data
    await clearTestDatabase()
    
    // Seed with initial test data
    await seedTestDatabase()
  } catch (error) {
    console.error('Error setting up test database:', error)
    throw error
  }
}

/**
 * Clears all data from test database
 * @returns {Promise<void>}
 */
const clearTestDatabase = async () => {
  try {
    // Clear in order to respect foreign key constraints
    await Transaction.destroy({ where: {}, force: true })
    await Balance.destroy({ where: {}, force: true })
    await User.destroy({ where: {}, force: true })
  } catch (error) {
    console.error('Error clearing test database:', error)
    throw error
  }
}

/**
 * Seeds test database with initial data
 * @returns {Promise<void>}
 */
const seedTestDatabase = async () => {
  try {
    // Create test users
    await User.bulkCreate([
      { id: 'user1' },
      { id: 'user2' },
      { id: 'user3' }
    ])

    // Create test balances
    await Balance.bulkCreate([
      // User 1 balances
      { userId: 'user1', chain: 'ethereum', amount: 1000 },
      { userId: 'user1', chain: 'polygon', amount: 500.25 },
      { userId: 'user1', chain: 'arbitrum', amount: 750.5 },
      { userId: 'user1', chain: 'optimism', amount: 250 },
      { userId: 'user1', chain: 'solana', amount: 501 },
      
      // User 2 balances
      { userId: 'user2', chain: 'ethereum', amount: 800 },
      { userId: 'user2', chain: 'polygon', amount: 300 },
      { userId: 'user2', chain: 'arbitrum', amount: 600 },
      { userId: 'user2', chain: 'optimism', amount: 200 },
      { userId: 'user2', chain: 'solana', amount: 1500 },
      
      // User 3 balances (minimal for testing edge cases)
      { userId: 'user3', chain: 'ethereum', amount: 10 },
      { userId: 'user3', chain: 'polygon', amount: 5 },
      { userId: 'user3', chain: 'arbitrum', amount: 15 },
      { userId: 'user3', chain: 'optimism', amount: 8 },
      { userId: 'user3', chain: 'solana', amount: 25 }
    ])
  } catch (error) {
    console.error('Error seeding test database:', error)
    throw error
  }
}

/**
 * Closes test database connection
 * @returns {Promise<void>}
 */
const closeTestDatabase = async () => {
  try {
    await sequelize.close()
  } catch (error) {
    console.error('Error closing test database:', error)
    throw error
  }
}

/**
 * Executes a function within a database transaction that gets rolled back
 * Useful for test isolation
 * @param {Function} testFunction - Function to execute within transaction
 * @returns {Promise<any>} Result of the test function
 */
const withTransaction = async (testFunction) => {
  const transaction = await sequelize.transaction()
  
  try {
    const result = await testFunction(transaction)
    await transaction.rollback() // Always rollback for test isolation
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

/**
 * Creates a fresh database state for each test
 * @returns {Promise<void>}
 */
const resetTestDatabase = async () => {
  await clearTestDatabase()
  await seedTestDatabase()
}

/**
 * Gets current database state for assertions
 * @returns {Promise<Object>} Current state with users, balances, and transactions
 */
const getDatabaseState = async () => {
  const users = await User.findAll()
  const balances = await Balance.findAll()
  const transactions = await Transaction.findAll()
  
  return {
    users: users.map(u => u.toJSON()),
    balances: balances.map(b => b.toJSON()),
    transactions: transactions.map(t => t.toJSON())
  }
}

/**
 * Creates isolated test environment for each test
 * Automatically handles setup and cleanup
 * @param {Function} testFunction - Test function to execute
 * @returns {Promise<any>} Result of test function
 */
const withIsolatedDatabase = async (testFunction) => {
  await resetTestDatabase()
  
  try {
    return await testFunction()
  } finally {
    // Cleanup is handled by the next test's reset
  }
}

/**
 * Validates database integrity after operations
 * @returns {Promise<Object>} Validation results
 */
const validateDatabaseIntegrity = async () => {
  const issues = []
  
  try {
    // Check for orphaned balances
    const balancesWithoutUsers = await sequelize.query(`
      SELECT b.* FROM Balances b 
      LEFT JOIN Users u ON b.userId = u.id 
      WHERE u.id IS NULL
    `, { type: sequelize.QueryTypes.SELECT })
    
    if (balancesWithoutUsers.length > 0) {
      issues.push(`Found ${balancesWithoutUsers.length} orphaned balances`)
    }
    
    // Check for orphaned transactions
    const transactionsWithoutUsers = await sequelize.query(`
      SELECT t.* FROM Transactions t 
      LEFT JOIN Users u1 ON t.fromUserId = u1.id 
      LEFT JOIN Users u2 ON t.toUserId = u2.id 
      WHERE u1.id IS NULL OR u2.id IS NULL
    `, { type: sequelize.QueryTypes.SELECT })
    
    if (transactionsWithoutUsers.length > 0) {
      issues.push(`Found ${transactionsWithoutUsers.length} orphaned transactions`)
    }
    
    // Check for negative balances
    const negativeBalances = await Balance.findAll({
      where: {
        amount: { [sequelize.Op.lt]: 0 }
      }
    })
    
    if (negativeBalances.length > 0) {
      issues.push(`Found ${negativeBalances.length} negative balances`)
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  } catch (error) {
    return {
      isValid: false,
      issues: [`Database integrity check failed: ${error.message}`]
    }
  }
}

/**
 * Creates test data in bulk for performance testing
 * @param {Object} config - Configuration for bulk data creation
 * @returns {Promise<Object>} Created data summary
 */
const createBulkTestData = async (config = {}) => {
  const {
    userCount = 100,
    transactionCount = 1000,
    balanceVariation = true
  } = config
  
  const users = []
  const balances = []
  const transactions = []
  
  // Create users
  for (let i = 1; i <= userCount; i++) {
    users.push({ id: `bulk-user-${i}` })
  }
  
  await User.bulkCreate(users)
  
  // Create balances for each user
  for (const user of users) {
    const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana']
    for (const chain of chains) {
      const baseAmount = balanceVariation ? Math.random() * 10000 : 1000
      balances.push({
        userId: user.id,
        chain,
        amount: Math.max(0.01, baseAmount)
      })
    }
  }
  
  await Balance.bulkCreate(balances)
  
  // Create transactions
  for (let i = 1; i <= transactionCount; i++) {
    const fromUser = users[Math.floor(Math.random() * users.length)]
    const toUser = users[Math.floor(Math.random() * users.length)]
    
    if (fromUser.id !== toUser.id) {
      transactions.push({
        txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
        type: Math.random() > 0.8 ? 'bridge' : 'transfer',
        amount: Math.random() * 1000 + 1,
        gasCost: Math.random() * 10 + 0.1,
        status: 'confirmed',
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        chain: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'][Math.floor(Math.random() * 5)]
      })
    }
  }
  
  await Transaction.bulkCreate(transactions)
  
  return {
    usersCreated: users.length,
    balancesCreated: balances.length,
    transactionsCreated: transactions.length
  }
}

module.exports = {
  setupTestDatabase,
  clearTestDatabase,
  seedTestDatabase,
  closeTestDatabase,
  withTransaction,
  resetTestDatabase,
  getDatabaseState,
  withIsolatedDatabase,
  validateDatabaseIntegrity,
  createBulkTestData
}
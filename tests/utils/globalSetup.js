/**
 * Global setup that runs once before all tests
 */

const { setupTestDatabase } = require('./testDatabase')

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DB_LOGGING = 'false'
  process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1'
  
  console.log('🚀 Starting test suite with enhanced infrastructure...')
  console.log('📊 Property-based tests configured for 100+ iterations')
  console.log('🗄️  Setting up isolated test database...')
  
  try {
    await setupTestDatabase()
    console.log('✅ Test database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error)
    throw error
  }
}
/**
 * Global teardown that runs once after all tests
 */

const { closeTestDatabase } = require('./testDatabase')

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    await closeTestDatabase()
    console.log('✅ Test database closed successfully')
  } catch (error) {
    console.error('⚠️  Warning: Error closing test database:', error)
  }
  
  console.log('✅ Test suite completed with enhanced infrastructure')
}
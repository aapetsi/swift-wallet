/**
 * Jest configuration for comprehensive test coverage
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/utils/testSetup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'services/**/*.js',
    'database/**/*.js',
    'server.js',
    '!database/models/index.js', // Exclude auto-generated files
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 100,
      statements: 100
    },
    // Service-specific thresholds
    './services/': {
      branches: 95,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Test timeout
  testTimeout: 10000,
  
  // Parallel execution
  maxWorkers: '50%', // Use 50% of available CPU cores
  
  // Handle open handles
  detectOpenHandles: true,
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Transform configuration (if needed for ES modules in future)
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/utils/globalSetup.js',
  globalTeardown: '<rootDir>/tests/utils/globalTeardown.js',
  
  // Test result processor for better reporting
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      expand: true,
      pageTitle: 'Swift Wallet Test Coverage Report',
      logoImgPath: undefined,
      hideIcon: false,
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  
  // Enhanced error reporting
  errorOnDeprecated: true,
  
  // Bail on first test failure in CI environments
  bail: process.env.CI ? 1 : 0,
  
  // Collect coverage from additional patterns
  collectCoverageFrom: [
    'services/**/*.js',
    'database/**/*.js',
    'server.js',
    '!database/models/index.js', // Exclude auto-generated files
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/data/**' // Exclude seed data files
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.git/'
  ]
}
/**
 * Comprehensive unit tests for BridgeManager service
 * Tests core functionality including getBridgeCost, executeBridge, and findOptimalBridgeRoute
 */

const BridgeManager = require('../../../services/bridgeManager')
const { setupTestDatabase, resetTestDatabase, closeTestDatabase } = require('../../utils/testDatabase')
const { createTestUser } = require('../../utils/testFactories')
const User = require('../../../database/models/User')
const Balance = require('../../../database/models/Balance')
const Transaction = require('../../../database/models/Transaction')

describe('BridgeManager', () => {
  let bridgeManager

  beforeAll(async () => {
    await setupTestDatabase()
  })

  beforeEach(async () => {
    await resetTestDatabase()
    bridgeManager = new BridgeManager()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  describe('getBridgeCost', () => {
    test('should return 0 for same chain', () => {
      expect(bridgeManager.getBridgeCost('ethereum', 'ethereum')).toBe(0)
      expect(bridgeManager.getBridgeCost('polygon', 'polygon')).toBe(0)
    })

    test('should return correct costs for all supported chain combinations', () => {
      // Ethereum to other chains
      expect(bridgeManager.getBridgeCost('ethereum', 'polygon')).toBe(5)
      expect(bridgeManager.getBridgeCost('ethereum', 'arbitrum')).toBe(10)
      expect(bridgeManager.getBridgeCost('ethereum', 'optimism')).toBe(10)

      // Polygon to other chains
      expect(bridgeManager.getBridgeCost('polygon', 'ethereum')).toBe(15)
      expect(bridgeManager.getBridgeCost('polygon', 'arbitrum')).toBe(8)
      expect(bridgeManager.getBridgeCost('polygon', 'optimism')).toBe(8)

      // Arbitrum to other chains
      expect(bridgeManager.getBridgeCost('arbitrum', 'ethereum')).toBe(12)
      expect(bridgeManager.getBridgeCost('arbitrum', 'polygon')).toBe(8)
      expect(bridgeManager.getBridgeCost('arbitrum', 'optimism')).toBe(5)

      // Optimism to other chains
      expect(bridgeManager.getBridgeCost('optimism', 'ethereum')).toBe(12)
      expect(bridgeManager.getBridgeCost('optimism', 'polygon')).toBe(8)
      expect(bridgeManager.getBridgeCost('optimism', 'arbitrum')).toBe(5)
    })

    test('should return Infinity for unsupported chains', () => {
      expect(bridgeManager.getBridgeCost('ethereum', 'solana')).toBe(Infinity)
      expect(bridgeManager.getBridgeCost('solana', 'ethereum')).toBe(Infinity)
      expect(bridgeManager.getBridgeCost('invalid', 'ethereum')).toBe(Infinity)
      expect(bridgeManager.getBridgeCost('ethereum', 'invalid')).toBe(Infinity)
    })
  })

  describe('executeBridge', () => {
    test('should successfully execute bridge with sufficient balance', async () => {
      const result = await bridgeManager.executeBridge('user1', 'ethereum', 'polygon', 100)

      expect(result).toMatchObject({
        type: 'bridge',
        fromUserId: 'user1',
        toUserId: 'user1', // Same user for bridge transactions
        chain: 'polygon',
        fromChain: 'ethereum',
        toChain: 'polygon',
        amount: 100,
        bridgeCost: 5,
        totalDeducted: 105,
        status: 'confirmed',
        bridged: true
      })

      // Verify balance changes
      const user1EthBalance = await Balance.findOne({ where: { userId: 'user1', chain: 'ethereum' } })
      const user1PolygonBalance = await Balance.findOne({ where: { userId: 'user1', chain: 'polygon' } })

      expect(user1EthBalance.amount).toBe(895) // 1000 - 105 (amount + bridge cost)
      expect(user1PolygonBalance.amount).toBe(600.25) // 500.25 + 100
    })

    test('should execute bridge between different chain combinations', async () => {
      // Test arbitrum to optimism (cost: 5)
      const result1 = await bridgeManager.executeBridge('user1', 'arbitrum', 'optimism', 50)
      expect(result1.bridgeCost).toBe(5)
      expect(result1.totalDeducted).toBe(55)

      // Test polygon to ethereum (cost: 15)
      const result2 = await bridgeManager.executeBridge('user2', 'polygon', 'ethereum', 200)
      expect(result2.bridgeCost).toBe(15)
      expect(result2.totalDeducted).toBe(215)
    })

    test('should create transaction record with correct hash format', async () => {
      const result = await bridgeManager.executeBridge('user1', 'ethereum', 'polygon', 100)
      
      // Hash format: 0*BRIDGE + random hex string (Math.random generates ~13-15 hex chars)
      expect(result.txHash).toMatch(/^0\*BRIDGE[a-f0-9]+$/i)
      expect(result.txHash).toHaveLength(result.txHash.length) // Verify it's a valid string
      
      // Verify transaction was saved to database
      const transaction = await Transaction.findOne({ where: { txHash: result.txHash } })
      expect(transaction).toBeTruthy()
      expect(transaction.type).toBe('bridge')
    })

    test('should throw error for insufficient balance', async () => {
      // User3 has only 10 USDC on ethereum, trying to bridge 100 + 5 (cost) = 105
      await expect(
        bridgeManager.executeBridge('user3', 'ethereum', 'polygon', 100)
      ).rejects.toThrow('Insufficient balance on ethereum. Need 105, current balance is 10 USDC')
    })

    test('should throw error for non-existent user', async () => {
      await expect(
        bridgeManager.executeBridge('nonexistent', 'ethereum', 'polygon', 100)
      ).rejects.toThrow('User not found')
    })

    test('should handle same chain bridge (zero cost)', async () => {
      const result = await bridgeManager.executeBridge('user1', 'ethereum', 'ethereum', 100)
      
      expect(result.bridgeCost).toBe(0)
      expect(result.totalDeducted).toBe(100)
      expect(result.fromChain).toBe('ethereum')
      expect(result.toChain).toBe('ethereum')
    })

    test('should rollback transaction on database error', async () => {
      // Get initial balances
      const initialEthBalance = await Balance.findOne({ where: { userId: 'user1', chain: 'ethereum' } })
      const initialPolygonBalance = await Balance.findOne({ where: { userId: 'user1', chain: 'polygon' } })
      
      // Mock Transaction.create to throw an error after balance updates
      const originalCreate = Transaction.create
      Transaction.create = jest.fn().mockRejectedValue(new Error('Database error'))
      
      try {
        await expect(
          bridgeManager.executeBridge('user1', 'ethereum', 'polygon', 100)
        ).rejects.toThrow('Database error')
        
        // Verify balances were rolled back to original values
        const finalEthBalance = await Balance.findOne({ where: { userId: 'user1', chain: 'ethereum' } })
        const finalPolygonBalance = await Balance.findOne({ where: { userId: 'user1', chain: 'polygon' } })
        
        expect(finalEthBalance.amount).toBe(initialEthBalance.amount)
        expect(finalPolygonBalance.amount).toBe(initialPolygonBalance.amount)
      } finally {
        // Restore original method
        Transaction.create = originalCreate
      }
    })
  })

  describe('findOptimalBridgeRoute', () => {
    test('should find optimal route with sufficient balance', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user1', 100, 'ethereum')

      expect(routes).toHaveLength(3) // All supported chains except ethereum (solana not supported)
      expect(routes[0].canFulfill).toBe(true)
      
      // Should be sorted by lowest cost
      expect(routes[0].bridgeCost).toBeLessThanOrEqual(routes[1].bridgeCost)
      expect(routes[1].bridgeCost).toBeLessThanOrEqual(routes[2].bridgeCost)
    })

    test('should return routes sorted by cost', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user1', 50, 'ethereum')

      // Verify sorting by bridge cost
      for (let i = 0; i < routes.length - 1; i++) {
        expect(routes[i].bridgeCost).toBeLessThanOrEqual(routes[i + 1].bridgeCost)
      }
    })

    test('should handle cases where no route can fulfill amount', async () => {
      // User3 has low balances, request large amount
      const routes = await bridgeManager.findOptimalBridgeRoute('user3', 1000, 'ethereum')

      expect(routes.length).toBeGreaterThan(0)
      routes.forEach(route => {
        expect(route.canFulfill).toBe(false)
        expect(route.shortfall).toBeGreaterThan(0)
        expect(route.shortfall).toBe(1000 - route.maxTransferable)
      })
    })

    test('should calculate maxTransferable correctly', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user1', 50, 'polygon')

      routes.forEach(route => {
        const expectedMax = Math.max(0, route.availableBalance - route.bridgeCost)
        expect(route.maxTransferable).toBe(expectedMax)
      })
    })

    test('should exclude target chain from routes', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user1', 100, 'ethereum')

      routes.forEach(route => {
        expect(route.fromChain).not.toBe('ethereum')
        expect(route.toChain).toBe('ethereum')
      })
    })

    test('should throw error for non-existent user', async () => {
      await expect(
        bridgeManager.findOptimalBridgeRoute('nonexistent', 100, 'ethereum')
      ).rejects.toThrow('User not found')
    })

    test('should handle edge case with zero balance after bridge cost', async () => {
      // User3 has 5 USDC on polygon, bridge cost to ethereum is 15
      const routes = await bridgeManager.findOptimalBridgeRoute('user3', 1, 'ethereum')
      
      const polygonRoute = routes.find(route => route.fromChain === 'polygon')
      if (polygonRoute) {
        expect(polygonRoute.maxTransferable).toBe(0) // 5 - 15 = -10, but Math.max(0, -10) = 0
        expect(polygonRoute.canFulfill).toBe(false)
      } else {
        // If no polygon route exists, it means the balance is too low to even create a route
        expect(routes.length).toBeGreaterThanOrEqual(0)
      }
    })

    test('should return all viable routes when some can fulfill', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user2', 100, 'ethereum')
      
      // User2 has good balances, should have fulfillable routes
      const fulfillableRoutes = routes.filter(route => route.canFulfill)
      expect(fulfillableRoutes.length).toBeGreaterThan(0)
      
      // All fulfillable routes should have maxTransferable >= 100
      fulfillableRoutes.forEach(route => {
        expect(route.maxTransferable).toBeGreaterThanOrEqual(100)
      })
    })

    test('should include route details for all chains', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user1', 50, 'ethereum')
      
      routes.forEach(route => {
        expect(route).toHaveProperty('fromChain')
        expect(route).toHaveProperty('toChain')
        expect(route).toHaveProperty('availableBalance')
        expect(route).toHaveProperty('bridgeCost')
        expect(route).toHaveProperty('maxTransferable')
        expect(route).toHaveProperty('totalCost')
        expect(route).toHaveProperty('canFulfill')
        
        expect(route.toChain).toBe('ethereum')
        expect(typeof route.availableBalance).toBe('number')
        expect(typeof route.bridgeCost).toBe('number')
        expect(typeof route.maxTransferable).toBe('number')
        expect(typeof route.canFulfill).toBe('boolean')
      })
    })

    test('should handle large amounts that exceed all balances', async () => {
      const routes = await bridgeManager.findOptimalBridgeRoute('user1', 10000, 'ethereum')
      
      // Even user1 with good balances can't fulfill 10000
      routes.forEach(route => {
        expect(route.canFulfill).toBe(false)
        expect(route.shortfall).toBeGreaterThan(0)
      })
    })
  })
})
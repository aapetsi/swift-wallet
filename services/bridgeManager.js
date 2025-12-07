// const users = require('../data/users')
// const transactions = require('../data/transactions')

const { getUserBalance, updateBalance } = require('../database/helperMethods')
const Transaction = require('../database/models/Transaction')
const User = require('../database/models/User')
const sequelize = require('../database/sequelize')

// Bridge Manager
class BridgeManager {
  constructor() {
    this.bridgeCosts = {
      ethereum: { to: { polygon: 5, arbitrum: 10, optimism: 10 } },
      polygon: { to: { ethereum: 15, arbitrum: 8, optimism: 8 } },
      arbitrum: { to: { ethereum: 12, polygon: 8, optimism: 5 } },
      optimism: { to: { ethereum: 12, polygon: 8, arbitrum: 5 } }
    }
  }

  getBridgeCost(fromChain, toChain) {
    if (fromChain === toChain) return 0
    const fromCfg = this.bridgeCosts[fromChain]
    if (!fromCfg || !fromCfg.to) return Infinity
    const cost = fromCfg.to[toChain]
    return typeof cost === 'number' ? cost : Infinity
  }

  async executeBridge(userId, fromChain, toChain, amount) {
    const t = await sequelize.transaction()

    try {
      const user = await User.findByPk(userId) // users.get(userId)
      if (!user) throw new Error('User not found')

      const bridgeCost = this.getBridgeCost(fromChain, toChain)
      const totalRequired = amount + bridgeCost

      const currentBalance = await getUserBalance(userId, fromChain)

      if (currentBalance < totalRequired)
        throw new Error(
          `Insufficient balance on ${fromChain}. Need ${totalRequired}, current balance is ${currentBalance} USDC`
        )

      const bridgeTransactionHash = `0*BRIDGE${Math.random()
        .toString(16)
        .substring(2, 58)}`
      const timestamp = new Date().toISOString()

      // Deduct from source chain (including bridge fee)
      await updateBalance(userId, fromChain, -totalRequired)
      // user.balances[fromChain] -= totalRequired

      // Add to destination chain
      await updateBalance(userId, toChain, amount)
      // user.balances[toChain] += amount

      const bridgeTransaction = await Transaction.create(
        {
          txHash: bridgeTxHash,
          type: 'bridge',
          fromUserId: userId,
          toUserId: null,
          chain: toChain,
          fromChain,
          toChain,
          amount,
          bridgeCost,
          gasCost: 0,
          totalDeducted: totalRequired,
          status: 'confirmed',
          bridged: true
        },
        { transaction: t }
      )

      await t.commit()

      return bridgeTransaction.toJSON()
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  async findOptimalBridgeRoute(userId, targetAmount, targetChain) {
    const user = await User.findByPk(userId) //users.get(userId)
    if (!user) throw new Error('User not found')

    const { balancesByChain } = await getUserBalance(userId)

    const routes = []

    for (const [chain, balance] of Object.entries(balancesByChain)) {
      if (chain === targetChain) continue

      const bridgeCost = this.getBridgeCost(chain, targetChain)
      const maxTransferable = Math.max(0, balance - bridgeCost)

      if (maxTransferable >= targetAmount) {
        routes.push({
          fromChain: chain,
          toChain: targetChain,
          availableBalance: balance,
          bridgeCost,
          maxTransferable,
          totalCost: bridgeCost,
          canFulfill: true
        })
      }
    }

    // if all the routes can't fulfill the amount, show all the vaible routes
    if (routes.length === 0) {
      for (const [chain, balance] of Object.entries(balancesByChain)) {
        if (chain === targetChain) continue

        const bridgeCost = this.getBridgeCost(chain, targetChain)
        const maxTransferable = Math.max(0, balance - bridgeCost)

        if (maxTransferable > 0) {
          routes.push({
            fromChain: chain,
            toChain: targetChain,
            availableBalance: balance,
            bridgeCost,
            maxTransferable,
            totalCost: bridgeCost,
            canFulfill: false,
            shortfall: targetAmount - maxTransferable
          })
        }
      }
    }

    // Sort by lowest cost
    routes.sort((a, b) => a.bridgeCost - b.bridgeCost)

    return routes
  }
}

module.exports = BridgeManager

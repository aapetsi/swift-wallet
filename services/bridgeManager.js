const users = require('../data/users')
const transactions = require('../data/transactions')
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
    const user = users.get(userId)
    if (!user) throw new Error('User not found')

    const bridgeCost = this.getBridgeCost(fromChain, toChain)
    const totalRequired = amount + bridgeCost

    if (user.balances[fromChain] < totalRequired)
      throw new Error(
        `Insufficient balance on ${fromChain}. Need ${totalRequired}, current balance is ${user.balances[fromChain]}`
      )

    const bridgeTransactionHash = `0*BRIDGE${Math.random()
      .toString(16)
      .substring(2, 58)}`
    const timestamp = new Date().toISOString()

    // Deduct from source chain (including bridge fee)
    user.balances[fromChain] -= totalRequired

    // Add to destination chain
    user.balances[toChain] += amount

    const bridgeTransaction = {
      transactionHash: bridgeTransactionHash,
      type: 'bridge',
      fromChain,
      toChain,
      userId,
      amount,
      bridgeCost,
      totalDeducted: totalRequired,
      status: 'confirmed',
      timestamp
    }

    transactions.set(bridgeTransactionHash, bridgeTransaction)
    return bridgeTransaction
  }

  async findOptimalBridgeRoute(userId, targetAmount, targetChain) {
    const user = users.get(userId)
    if (!user) throw new Error('User not found')

    const routes = []

    for (const [chain, balance] of Object.entries(user.balances)) {
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
          totalCost: bridgeCost
        })
      }
    }

    // Sort by lowest cost
    routes.sort((a, b) => a.bridgeCost - b.bridgeCost)

    return routes
  }
}

module.exports = BridgeManager

const { getUserBalance } = require('../database/helperMethods')
const User = require('../database/models/User')
const GasPriceOracle = require('./gasPriceOracle')
const gasPriceOracle = new GasPriceOracle()

// Chain Selector
class ChainSelector {
  async selectOptimalChain(userId, amount) {
    const user = await User.findByPk(userId) // users.get(userId)

    if (!user) throw new Error('User not found')

    // Retrieve gas costs for all chains
    const gasCosts = await gasPriceOracle.getAllGasCosts()
    const { balancesByChain } = await getUserBalance(userId)

    // Find chains with sufficient balance for the transaction
    const viableChains = gasCosts
      .filter(({ chain }) => balancesByChain[chain] >= amount)
      .map((gasInfo) => ({
        ...gasInfo,
        balance: balancesByChain[gasInfo.chain],
        totalCost: amount + gasInfo.estimatedCostUSDC
      }))
      .sort((a, b) => a.estimatedCostUSDC - b.estimatedCostUSDC)

    if (viableChains.length === 0) {
      // check if user has total balance across all the blockchains
      const { total: totalBalance } = await getUserBalance(userId)

      if (totalBalance >= amount) {
        return {
          success: false,
          reason: 'NEEDS_BRIDGE',
          message: 'Insufficient balance on single chain. Bridging required',
          totalBalance,
          requiredAmount: amount
        }
      }

      throw new Error('Insufficient total balance')
    }

    return {
      success: true,
      selectedChain: viableChains[0].chain,
      gasCost: viableChains[0].estimatedCostUSDC,
      alternatives: viableChains.slice(1, 3)
    }
  }
}

module.exports = ChainSelector

// Mock Gas Price Oracle
class GasPriceOracle {
  constructor() {
    /**
     * Gas prices are in Gwei
     * Transfer cost is Gas units
     */
    this.gasPrices = {
      ethereum: { gasPrice: 50, transferCost: 21000, nativeToken: 'ETH' },
      polygon: { gasPrice: 30, transferCost: 21000, nativeToken: 'MATIC' },
      arbitrum: { gasPrice: 0.1, transferCost: 21000, nativeToken: 'ETH' },
      optimism: { gasPrice: 0.1, transferCost: 21000, nativeToken: 'ETH' },
      solana: { gasPrice: 0.05, transferCost: 21000, nativeToken: 'SOL' }
    }

    this.exchangeRates = {
      ETH: 3500,
      MATIC: 0.85,
      SOL: 133
    }
  }

  async getGasCost(chain) {
    const { gasPrice, transferCost, nativeToken } = this.gasPrices[chain]
    const exchangeRate = this.exchangeRates[nativeToken]
    const constInNativeToken = (gasPrice * transferCost) / 1e9
    const costInUSDC = constInNativeToken * exchangeRate

    return {
      chain,
      gasPrice,
      transferCost,
      nativeToken,
      constInNativeToken: parseFloat(constInNativeToken.toFixed(9)),
      exchangeRate,
      estimatedCostUSDC: parseFloat(costInUSDC.toFixed(6))
    }
  }

  async getAllGasCosts() {
    const chains = Object.keys(this.gasPrices)
    const costs = await Promise.all(
      chains.map((chain) => this.getGasCost(chain))
    )

    return costs
  }
}

module.exports = GasPriceOracle

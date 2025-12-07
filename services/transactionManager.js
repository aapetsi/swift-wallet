const users = require('../data/users')
const transactions = require('../data/transactions')
const ChainSelector = require('./chainSelector')
const GasPriceOracle = require('./gasPriceOracle')
const Blockchain = require('./blockchain')
const BridgeManager = require('./bridgeManager')

const chainSelector = new ChainSelector()
const blockchain = new Blockchain()
const gasPriceOracle = new GasPriceOracle()
const bridgeManager = new BridgeManager()

// Transaction Manager
class TransactionManager {
  async executeTransaction(fromUserId, toUserId, amount) {
    const fromUser = users.get(fromUserId)
    const toUser = users.get(toUserId)

    if (!fromUser) throw new Error('Sender not found')
    if (!toUser) throw new Error('Recipient not found')
    if (amount <= 0) throw new Error('Amount must be greater than 0')

    // Select optimal chain
    const selection = await chainSelector.selectOptimalChain(fromUserId, amount)

    // If bridging is needed and auto-bridge is enabled
    if (!selection.success && selection.reason === 'NEEDS_BRIDGE') {
      return await this.executeWithBridge(fromUserId, toUserId, amount)
    }

    if (!selection.success) return selection

    const { selectedChain, gasCost } = selection

    // Execute blockchain transaction
    const transactionResult = await blockchain.sendTransaction(
      selectedChain,
      fromUserId,
      toUserId,
      amount
    )

    // update balances
    fromUser.balances[selectedChain] -= amount + gasCost
    toUser.balances[selectedChain] += amount

    // Save transaction to memory
    const transaction = {
      ...transactionResult,
      gasCost,
      netAmount: amount,
      totalDeducted: amount + gasCost
    }
    transactions.set(transactionResult.transactionHash, transaction)

    return {
      success: true,
      transaction
    }
  }

  async executeWithBridge(fromUserId, toUserId, amount) {
    const fromUser = users.get(fromUserId)

    // Get all gas costs to find cheapest destination chain
    const gasCosts = await gasPriceOracle.getAllGasCosts()
    gasCosts.sort((a, b) => a.estimatedCostUSDC - b.estimatedCostUSDC)

    const targetChain = gasCosts[0].chain
    const targetGasCost = gasCosts[0].estimatedCostUSDC

    // Find optimal bridge route
    const routes = await bridgeManager.findOptimalBridgeRoute(
      fromUserId,
      amount + targetGasCost,
      targetChain
    )

    if (routes.length === 0) {
      throw new Error('No viable bridge routes available')
    }

    // Select best route (already sorted by cost)
    const bestRoute = routes[0]
    const amountToBridge = amount + targetGasCost

    if (bestRoute.maxTransferable < amountToBridge) {
      throw new Error(
        `Insufficient balance to bridge. Need ${amountToBridge}, can transfer ${bestRoute.maxTransferable}`
      )
    }

    // Execute bridge
    const bridgeTx = await bridgeManager.executeBridge(
      fromUserId,
      bestRoute.fromChain,
      targetChain,
      amountToBridge
    )

    // Now execute the actual send transaction on the target chain
    const txResult = await blockchain.sendTransaction(
      targetChain,
      fromUserId,
      toUserId,
      amount
    )

    // Update balances
    fromUser.balances[targetChain] -= amount + targetGasCost
    const toUser = this.users.get(toUserId)
    toUser.balances[targetChain] += amount

    // Store transaction
    const transaction = {
      ...txResult,
      gasCost: targetGasCost,
      netAmount: amount,
      totalDeducted: amount + targetGasCost,
      bridged: true,
      bridgeDetails: {
        fromChain: bridgeTx.fromChain,
        toChain: bridgeTx.toChain,
        bridgeCost: bridgeTx.bridgeCost,
        bridgeTxHash: bridgeTx.transactionHash
      }
    }
    transactions.set(txResult.transactionHash, transaction)

    return {
      success: true,
      bridged: true,
      bridgeTransaction: bridgeTx,
      transaction,
      totalCost: targetGasCost + bridgeTx.bridgeCost
    }
  }

  async getTransactionStatus(transactionHash) {
    return await blockchain.getTransaction(transactionHash)
  }
}

module.exports = TransactionManager

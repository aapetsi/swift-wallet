const ChainSelector = require('./chainSelector')
const GasPriceOracle = require('./gasPriceOracle')
const Blockchain = require('./blockchain')
const BridgeManager = require('./bridgeManager')
const User = require('../database/models/User')
const { updateBalance } = require('../database/helperMethods')
const sequelize = require('../database/sequelize')
const Transaction = require('../database/models/Transaction')

const chainSelector = new ChainSelector()
const blockchain = new Blockchain()
const gasPriceOracle = new GasPriceOracle()
const bridgeManager = new BridgeManager()

// Transaction Manager
class TransactionManager {
  async executeTransaction(fromUserId, toUserId, amount) {
    const fromUser = await User.findByPk(fromUserId)
    const toUser = await User.findByPk(toUserId)

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

    const t = await sequelize.transaction()
    // Execute blockchain transaction
    try {
      const transactionResult = await blockchain.sendTransaction(
        selectedChain,
        fromUserId,
        toUserId,
        amount
      )

      // update balances
      await updateBalance(fromUserId, selectedChain, -(amount + gasCost))
      await updateBalance(toUserId, selectedChain, amount)

      // Save transaction to database
      const transaction = await Transaction.create(
        {
          txHash: transactionResult.transactionHash,
          type: 'transfer',
          fromUserId,
          toUserId,
          chain: selectedChain,
          amount,
          gasCost,
          bridgeCost: 0,
          totalDeducted: amount + gasCost,
          status: 'confirmed',
          blockNumber: transactionResult.blockNumber,
          bridged: false
        },
        { transaction: t }
      )

      await t.commit()

      return {
        success: true,
        transaction: transaction.toJSON()
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  async executeWithBridge(fromUserId, toUserId, amount) {
    // const fromUser = await User.findByPk(fromUserId) // users.get(fromUserId)

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
    console.log(routes)
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

    const t = await sequelize.transaction()
    try {
      // Update balances
      await updateBalance(fromUserId, targetChain, -(amount + targetGasCost), {
        transaction: t
      })
      await updateBalance(toUserId, targetChain, amount, { transaction: t })

      // Store transaction
      const transaction = await Transaction.create(
        {
          txHash: txResult.transactionHash,
          type: 'transfer',
          fromUserId,
          toUserId,
          chain: targetChain,
          amount,
          gasCost: targetGasCost,
          bridgeCost: bridgeTx.bridgeCost,
          totalDeducted: amount + targetGasCost,
          status: 'confirmed',
          blockNumber: txResult.blockNumber,
          bridged: true
        },
        { transaction: t }
      )

      await t.commit()

      return {
        success: true,
        bridged: true,
        bridgeTransaction: bridgeTx,
        transaction: transaction.toJSON(),
        totalCost: targetGasCost + bridgeTx.bridgeCost
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  async getTransactionStatus(transactionHash) {
    return await blockchain.getTransaction(transactionHash)
  }
}

module.exports = TransactionManager

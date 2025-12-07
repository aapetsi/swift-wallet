const Transaction = require('../database/models/Transaction')

// Mock Blockchain
class MockBlockchain {
  async sendTransaction(chain, from, to, amount) {
    const transactionHash = `0x${Math.random().toString(16).substring(2, 64)}`
    const timestamp = new Date().toISOString()

    return {
      transactionHash,
      chain,
      from,
      to,
      amount,
      status: 'confirmed',
      timestamp,
      blockNumber: Math.floor(Math.random() * 1000000)
    }
  }

  async getTransaction(transactionHash) {
    const transaction = await Transaction.findOne({
      where: { txHash: transactionHash }
    })

    if (!transaction) throw new Error('Transaction not found')

    return transaction.toJSON()
  }
}

module.exports = MockBlockchain

const transactions = require('../data/transactions')
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
    const transaction = transactions.get(transactionHash)

    if (!transaction) throw new Error('Transaction not found')

    return transaction
  }
}

module.exports = MockBlockchain

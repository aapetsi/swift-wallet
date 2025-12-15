const express = require('express')
const app = express()

const GasPriceOracle = require('./services/gasPriceOracle')
const ChainSelector = require('./services/chainSelector')
const TransactionManager = require('./services/transactionManager')
const User = require('./database/models/User')

const initializeDatabase = require('./database/initializeDatabase')
const { getUserBalance } = require('./database/helperMethods')

// Express Middleware
app.use(express.json())

const gasPriceOracle = new GasPriceOracle()

const chainSelector = new ChainSelector()

const transactionManager = new TransactionManager()

// api endpoints
app.get('/api/balance/:userId', async (req, res) => {
  const { userId } = req.params
  const user = await User.findByPk(userId) // users.get(userId)

  if (!user) return res.status(404).json({ error: 'User not found' })

  const { total, balancesByChain } = await getUserBalance(userId)

  res.status(200).json({
    userId,
    totalBalance: parseFloat(total.toFixed(2)),
    balancesByChain
  })
})

app.post('/api/send', async (req, res) => {
  try {
    const { to, from, amount } = req.body
    const amountNum = Number(amount)

    if (!to || !from || !Number.isFinite(amountNum) || amountNum <= 0)
      return res.status(400).json({
        error:
          'Make sure sender, recipient and amount have all been provided and amount must be a positive number'
      })

    const result = await transactionManager.executeTransaction(
      from,
      to,
      amountNum
    )

    if (!result.success) return res.status(400).json(result)

    res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/transaction/:transactionHash', async (req, res) => {
  try {
    const { transactionHash } = req.params
    const transaction = await transactionManager.getTransactionStatus(
      transactionHash
    )

    if (!transaction)
      return res.status(404).json({ message: 'Transaction not found' })

    return res.status(200).json(transaction)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/gas-prices', async (req, res) => {
  try {
    const gasCosts = await gasPriceOracle.getAllGasCosts()

    res.json({ gasCosts })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/estimate', async (req, res) => {
  try {
    const { userId, amount } = req.body
    const amountNum = Number(amount)

    if (!userId || !Number.isFinite(amountNum) || amountNum <= 0)
      return res.status(400).json({
        error: 'Missing required fields: userId, amount (positive number)'
      })

    const selection = await chainSelector.selectOptimalChain(userId, amountNum)

    return res.status(200).json(selection)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.get('/health', async (req, res) => {
  return res
    .status(200)
    .json({ status: 'healthy', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3000

let server
if (require.main === module) {
  initializeDatabase().then(() => {
    server = app.listen(PORT, () => {
      console.log(`🚀 SwiftWallet Server is running on port ${PORT}`)
    })
  })
}

module.exports = app

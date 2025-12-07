const Balance = require('../models/Balance')
const sequelize = require('../sequelize')

async function getUserBalance(userId, chain = null) {
  const where = { userId }
  if (chain) where.chain = chain

  const balances = await Balance.findAll({ where })

  if (chain) {
    return balances[0] ? parseFloat(balances[0].amount) : 0
  }

  const balancesByChain = {}
  let total = 0

  for (const balance of balances) {
    const amount = parseFloat(balance.amount)
    balancesByChain[balance.chain] = amount
    total += amount
  }

  return { total, balancesByChain }
}

async function updateBalance(userId, chain, amount, transaction = null) {
  const t = transaction || (await sequelize.transaction())

  try {
    const [balance] = await Balance.findOrCreate({
      where: { userId, chain },
      defaults: { userId, chain, amount: 0 },
      transaction: t
    })

    const newAmount = parseFloat(balance.amount) + amount

    if (newAmount < 0) {
      throw new Error(
        `Insufficient balance on ${chain}. Current: ${balance.amount}, Attempted: ${amount}`
      )
    }

    await balance.update({ amount: newAmount }, { transaction: t })

    if (!transaction) await t.commit()
    return parseFloat(newAmount)
  } catch (error) {
    if (!transaction) await t.rollback()
    throw error
  }
}

module.exports = {
  getUserBalance,
  updateBalance
}

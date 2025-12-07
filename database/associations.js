const User = require('./models/User')
const Transaction = require('./models/Transaction')
const Balance = require('./models/Balance')

function defineAssociations() {
  User.hasMany(Balance, { foreignKey: 'userId', as: 'balances' })
  User.hasMany(Transaction, {
    foreignKey: 'fromUserId',
    as: 'sentTransactions'
  })
  User.hasMany(Transaction, {
    foreignKey: 'toUserId',
    as: 'receivedTransactions'
  })

  Transaction.belongsTo(User, { foreignKey: 'fromUserId', as: 'sender' })
  Transaction.belongsTo(User, { foreignKey: 'toUserId', as: 'recipient' })

  Balance.belongsTo(User, { foreignKey: 'userId' })

  console.log('🔥 Associations defined')
}

module.exports = defineAssociations

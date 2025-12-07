const sequelize = require('./sequelize')
const User = require('./models/User')
const Balance = require('./models/Balance')
const defineAssociations = require('./associations')

// initialize database and seed data
const initializeDatabase = async () => {
  await sequelize.sync({ force: true })

  console.log('♻️  Database initialized')

  defineAssociations()

  // Create sample users
  await User.create({ id: 'user1', email: 'apetsi@gmail.com' })
  await User.create({ id: 'user2', email: 'apetsi@yahoo.com' })

  // Create balances for user1 and user2
  await Balance.bulkCreate([
    { userId: 'user1', chain: 'ethereum', amount: 1000.5 },
    { userId: 'user1', chain: 'polygon', amount: 500.25 },
    { userId: 'user1', chain: 'arbitrum', amount: 750.0 },
    { userId: 'user1', chain: 'optimism', amount: 250.75 },
    { userId: 'user1', chain: 'solana', amount: 500.25 }
  ])
  await Balance.bulkCreate([
    { userId: 'user2', chain: 'ethereum', amount: 2000.0 },
    { userId: 'user2', chain: 'polygon', amount: 1000 },
    { userId: 'user2', chain: 'arbitrum', amount: 1500 },
    { userId: 'user2', chain: 'optimism', amount: 500 },
    { userId: 'user2', chain: 'solana', amount: 350 }
  ])
}

module.exports = initializeDatabase

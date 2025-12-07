const { Sequelize } = require('sequelize')
// const User = require('./models/User')
// const Balance = require('./models/Balance')
// const Transaction = require('./models/Balance')

// Database setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './swiftwallet.db',
  logging: console.log
})

module.exports = sequelize

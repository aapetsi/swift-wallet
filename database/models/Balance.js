const { DataTypes } = require('sequelize')
const sequelize = require('../sequelize')
const User = require('./User')

const Balance = sequelize.define(
  'Balance',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    chain: {
      type: DataTypes.ENUM(
        'ethereum',
        'polygon',
        'arbitrum',
        'optimism',
        'solana'
      ),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(20, 6),
      defaultValue: 0,
      allowNull: false
    }
  },
  { timestamps: true, indexes: [{ unique: true, fields: ['userId', 'chain'] }] }
)

module.exports = Balance

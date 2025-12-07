const { DataTypes } = require('sequelize')
const sequelize = require('../sequelize')
const User = require('./User')

const Transaction = sequelize.define(
  'Transaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    txHash: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('transfer', 'bridge'),
      defaultValue: 'transfer',
      allowNull: false
    },
    fromUserId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    toUserId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    chain: {
      type: DataTypes.ENUM('ethereum', 'polygon', 'arbitrum', 'optimism'),
      allowNull: false
    },
    fromChain: {
      type: DataTypes.ENUM('ethereum', 'polygon', 'arbitrum', 'optimism'),
      allowNull: true // Only for bridge transactions
    },
    toChain: {
      type: DataTypes.ENUM('ethereum', 'polygon', 'arbitrum', 'optimism'),
      allowNull: true // Only for bridge transactions
    },
    amount: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false
    },
    gasCost: {
      type: DataTypes.DECIMAL(20, 6),
      defaultValue: 0
    },
    bridgeCost: {
      type: DataTypes.DECIMAL(20, 6),
      defaultValue: 0
    },
    totalDeducted: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
      defaultValue: 'confirmed',
      allowNull: false
    },
    blockNumber: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    bridged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    bridgeTxHash: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  { timestamps: true }
)

module.exports = Transaction

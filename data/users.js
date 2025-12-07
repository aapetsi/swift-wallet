const users = new Map()

users.set('user1', {
  id: 1,
  balances: {
    ethereum: 1000.5,
    polygon: 500.25,
    arbitrum: 750.0,
    optimism: 250.75,
    solana: 4400.21
  }
})

users.set('user2', {
  id: 2,
  balances: {
    ethereum: 2000.0,
    polygon: 1000.0,
    arbitrum: 1500.0,
    optimism: 500.0,
    solana: 2500.44
  }
})

module.exports = users

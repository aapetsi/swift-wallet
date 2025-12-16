const request = require('supertest')
const server = require('../server')
const initializeDatabase = require('../database/initializeDatabase')
const sequelize = require('../database/sequelize')

let transactionHash

describe('Test api endpoints', () => {
  beforeAll(async () => {
    await initializeDatabase()
  })

  afterAll(async () => {
    await sequelize.close()
  })

  it('GET /health should return server health status', async () => {
    const res = await request(server).get('/health')

    expect(res.statusCode).toEqual(200)
    expect(res.body.status).toEqual('healthy')
    expect(res.body.timestamp).toBeDefined()
  })

  it('GET /api/balance/:userId', async () => {
    const res = await request(server).get('/api/balance/user1')

    expect(res.statusCode).toEqual(200)
    expect(res.body.userId).toEqual('user1')
    expect(res.body.totalBalance).toEqual(3001.75)
  })

  it('GET /api/gas-prices', async () => {
    const res = await request(server).get('/api/gas-prices')

    expect(res.statusCode).toEqual(200)
    expect(res.body.gasCosts).toBeDefined()
    expect(res.body.gasCosts.length).toEqual(5)
  })

  it('POST /api/estimate', async () => {
    const res = await request(server)
      .post('/api/estimate')
      .send({ userId: 'user1', amount: 300 })

    expect(res.statusCode).toEqual(200)
    expect(res.body.selectedChain).toEqual('solana')
  })

  it('POST /api/send', async () => {
    const res = await request(server)
      .post('/api/send')
      .send({ to: 'user2', from: 'user1', amount: 300 })

    transactionHash = res.body.transaction.txHash
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(true)
  })

  it('POST /api/send fails to send', async () => {
    const res = await request(server).post('/api/send').send({})

    expect(res.statusCode).toEqual(400)
  })

  it('GET /api/transaction/:transactionHash', async () => {
    const res = await request(server).get(`/api/transaction/${transactionHash}`)

    expect(res.statusCode).toEqual(200)
  })
})

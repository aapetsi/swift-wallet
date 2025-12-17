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

  it('POST /api/send fails user not found', async () => {
    const res = await request(server)
      .post('/api/send')
      .send({ to: 'user1', from: 'user3', amount: 300 })

    expect(res.statusCode).toEqual(500)
  })

  it('POST /api/send fails user not found', async () => {
    const res = await request(server)
      .post('/api/send')
      .send({ to: 'user3', from: 'user1', amount: 300 })

    expect(res.statusCode).toEqual(500)
  })

  it('POST /api/send fails invalid amount', async () => {
    const res = await request(server)
      .post('/api/send')
      .send({ to: 'user2', from: 'user1', amount: 0 })

    expect(res.statusCode).toEqual(400)
  })

  // it('POST /api/send with bridging', async () => {
  //   const res = await request(server)
  //     .post('/api/send')
  //     .send({ to: 'user1', from: 'user2', amount: 1001 })

  //   expect(res.statusCode).toEqual(200)
  //   expect(res.body.success).toEqual(true)
  //   expect(res.body.bridged).toEqual(true)
  //   expect(res.body.bridgeTransaction).toBeDefined()
  //   expect(res.body.transaction).toBeDefined()
  //   expect(res.body.totalCost).toBeDefined()
  // })

  it('POST /api/send fails to send', async () => {
    const res = await request(server).post('/api/send').send({})

    expect(res.statusCode).toEqual(400)
  })

  it('GET /api/transaction/:transactionHash', async () => {
    const res = await request(server).get(`/api/transaction/${transactionHash}`)

    expect(res.statusCode).toEqual(200)
  })

  // it('GET /api/transaction/:transactionHash with invalid hash', async () => {
  //   const res = await request(server).get('/api/transaction/invalidhash')

  //   expect(res.statusCode).toEqual(404)
  // })

  // it('POST /api/send with invalid user', async () => {
  //   const res = await request(server)
  //     .post('/api/send')
  //     .send({ to: 'invalid', from: 'user1', amount: 100 })

  //   expect(res.statusCode).toEqual(500)
  // })

  // it('POST /api/send with negative amount', async () => {
  //   const res = await request(server)
  //     .post('/api/send')
  //     .send({ to: 'user2', from: 'user1', amount: -100 })

  //   expect(res.statusCode).toEqual(400)
  // })

  // it('POST /api/send with amount 0', async () => {
  //   const res = await request(server)
  //     .post('/api/send')
  //     .send({ to: 'user2', from: 'user1', amount: 0 })

  //   expect(res.statusCode).toEqual(400)
  // })

  // it('POST /api/send with insufficient balance', async () => {
  //   const res = await request(server)
  //     .post('/api/send')
  //     .send({ to: 'user2', from: 'user1', amount: 10000 })

  //   expect(res.statusCode).toEqual(500)
  // })

  // it('POST /api/estimate with invalid user', async () => {
  //   const res = await request(server)
  //     .post('/api/estimate')
  //     .send({ userId: 'invalid', amount: 100 })

  //   expect(res.statusCode).toEqual(500)
  // })

  // it('POST /api/estimate with negative amount', async () => {
  //   const res = await request(server)
  //     .post('/api/estimate')
  //     .send({ userId: 'user1', amount: -100 })

  //   expect(res.statusCode).toEqual(400)
  // })
})

# Getting Started

clone this repo `git clone https://github.com/aapetsi/swift-wallet.git`

install dependencies `npm install`

run the project using `npm start`

The following api endpoints are available to test. Copy and paste in your terminal to see the responses

## Check health

```bash
curl http://localhost:3000/health | jq .
```

## Check balance

```bash
curl http://localhost:3000/api/balance/user1 | jq .
```

## Send USDC

```bash
curl -X POST http://localhost:3000/api/send \
 -H "Content-Type: application/json" \
 -d '{"from":"user1","to":"user2","amount":2000}' | jq .
```

## Get gas prices

```bash
curl http://localhost:3000/api/gas-prices | jq .
```

## Get best chain

```bash
curl -X POST http://localhost:3000/api/estimate \
 -H "Content-Type: application/json" \
 -d '{"userId":"user1","amount":10}' | jq .
```

## Get transaction

```bash
curl http://localhost:3000/api/transaction/<hash> | jq .
```

# Route A - Spring Boot + Web3j

大作业路线 A：平台后端。后端账户部署 Escrow 并作为仲裁人，提供 6 个 REST 接口，
订单列表从 \`OrderCreated\` 事件日志重建。

## 运行

在 Ubuntu 中：

\`\`\`bash
cd ~/blockchain-course/my-first-dapp/route-a
export WEB3J_PRIVATE_KEY=0x...          # 只放在当前终端，不要写入文件
./gradlew bootRun
\`\`\`

默认连接 \`https://rpc-testnet.potos.hk\`，端口 8080。

也可以临时覆盖 RPC：

\`\`\`bash
./gradlew bootRun --args='--web3j.client-address=http://127.0.0.1:8545'
\`\`\`

## 必做接口

| 方法 | 路径 | 参数 | 返回 |
| --- | --- | --- | --- |
| POST | /api/escrow/deploy | 无 | contractAddress、transactionHash、deployBlock、arbiter |
| POST | /api/escrow/load | address、fromBlock | contractAddress、fromBlock |
| GET | /api/escrow/addresses | 无 | contractAddress、arbiter |
| GET | /api/escrow/orders/{id} | 无 | buyer、seller、token、amount、deadline、status（文字）、description |
| GET | /api/escrow/orders | 无 | id、buyer、seller、amount、blockNumber、transactionHash 数组 |
| POST | /api/escrow/orders/{id}/resolve | sellerWins | transactionHash、blockNumber、receiptStatus、status |

\`listOrders\` 按 POTOS 的 10 区块限制分批调用 \`eth_getLogs\`，只使用
\`OrderCreated\` 事件恢复订单 id，不循环调用 \`getOrder(0..orderCount-1)\`。

## 示例 SimpleStorage 接口（4A-3）

保留 Scaffold 示例的 \`/api/storage\`，用于先跑通部署/读写：

\`\`\`bash
curl -X POST http://localhost:8080/api/storage/deploy
curl -X POST "http://localhost:8080/api/storage/value/set?value=100"
curl -X GET http://localhost:8080/api/storage/value/get
\`\`\`

## 与 Remix 联调（路线 A 验收）

1. 启动后端，\`POST /api/escrow/deploy\`，记下 contractAddress、arbiter。
2. 在 Remix 用买家 A 的 MetaMask 调用新 Escrow 的 \`createOrder(B, LYToken, 30e18, deadline, "页面订单")\`。
3. A 调 \`approve(newEscrow, 60e18)\`，再 \`deposit(0)\`、\`deposit(1)\`。
4. B 调 \`dispute(1)\`。
5. 后端 \`GET /orders\`、\`GET /orders/0\`、\`GET /orders/1\`。
6. 后端先对订单 0 调 \`resolve(0,true)\`（非 Disputed，失败）；再对订单 1 调 \`resolve(1,false)\`（成功）。
7. A 调 \`confirm(0)\`；B 收到 30 个 LYToken。

## 安全

- 仓库中没有明文私钥；\`application.properties\` 使用 \`\${WEB3J_PRIVATE_KEY}\` 占位符。
- 运行前在终端 export；不要把私钥写入 \`.env\`、README 或代码。
- 这是课程演示，REST 接口没有鉴权；生产系统至少需要登录、角色校验、限流和审计。

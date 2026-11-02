# 2026《区块链技术与应用》大作业

路线 B（Next.js + EscrowV2）+ 全部加分项：路线 A（Spring Boot + Web3j）、重入攻击、卖家发货、双仲裁、订单时间线。

## 1. 已部署合约（POTOS Testnet，chainId 60600）

| 项目 | 地址 |
| --- | --- |
| 路线 B EscrowV2 | \`0xCF2Db535801A82f6Ac3823e1FF13C567f0B54ee4\` |
| LYToken | \`0xaf16F6a8E605b1827C5c4988E9D875CEaD670043\` |
| 仲裁人 1 | \`0x24e54D5AC0761c404c136aD5c79947857F7555e2\`（刘民强） |
| 仲裁人 2 / 买家 | \`0xA33E549d5FC06836fE91C41Fbbda3B5B1fAA677f\`（李渝） |
| 路线 A Escrow | \`0x0f440022B9B958AC9a035E62C88658Bdf0fCf991\` |
| 路线 A arbiter / 后端账户 | \`0xa33e549d5fc06836fe91c41fbbda3b5b1faa677f\` |
| SimpleStorage（4A-3 示例） | \`0x6c2c82b8b55b6d35f6140f695403964c84a531f9\` |

### 路线 B 交易

| 操作 | 交易哈希 |
| --- | --- |
| 部署 EscrowV2 | \`0x6bb6a2004264a056d469fbbc4a174e979543ec61915605bceb2ad1431c19ace8\` |
| 订单 0 createOrder | \`0xa807d5c586c59cf677004829f739e9051f68f9f100728785c10cb835805939dc\` |
| 订单 0 approve | \`0x71aeca6e99bf459ee9a999c8b9a13e0046c433ce247884769192ee58870e885d\` |
| 订单 0 deposit | \`0x78a1d18039863d9b6c5caeffba96fe7946dc821db2c8f5b782285d45b2621b3f\` |
| 订单 0 markShipped | \`0x4960e351bd315a553315f7dc71f64a95cea0d751ebf1315b8b03da817af1a44e\` |
| 订单 0 confirm | \`0x75ac3a89107aa7edf0717603826ff69d457f77158339f5a0f05cb7c75f67b345\` |
| 订单 1 createOrder | \`0x9448653af31cae23ba001e89199d00a23ecaa0fe1fbf50be0d6839ac7d65c1de\` |
| 订单 1 deposit | \`0x9b2175bf3d72092d7d83c4d377edb4c046ba4b02a0882b6a33aca398c84191ff\` |
| 订单 1 markShipped | \`0xc84beab4f47cd03c685de429c8f6bd27b74f2cfe0a5603ef710483ae61b8b778\` |
| 订单 1 dispute | \`0x3ca362aedde0ba846711e8347af974c9a0911c8bea548fce357145c6e5cd927e\` |
| 仲裁人 1 投票 | \`0x81e7d1314e2fa131348b3b851c013a365967c6e3cb3f0f655a64191538480c44\` |
| 仲裁人 2 投票 | \`0x736d59970a80d21ea7b30794ac014c012bafb815af21e126925244fa30d3f549\` |

### 路线 A 交易

| 操作 | 交易哈希 |
| --- | --- |
| 部署 Escrow | \`0xe30a93c8e2b0791ac4b28bedd010d259a38c41a3c7aaf3a58919d8e0459c6c38\` |
| createOrder 0 | \`0x9c7030f22d6729bfd3ab203bc1d564e20137dfd8ef48b106213a6eadc7bffc78\` |
| createOrder 1 | \`0x1cbd14e8d44b0090a74ca9c87e5c17272bf9adadf19947e2931a49bca6fd20b2\` |
| deposit 0 | \`0x25113137761590a3f5f3c6a433b1aefb4a1af8dca59e72d99f58d7eb0a80cef2\` |
| deposit 1 | \`0x7aac8f2914863e978ed0cd4da0241ceadbd6e7db0fca2a2d0f1604439d2992fe\` |
| resolve 1 | \`0xee5a89624e3e0a827a4ca619979b7c9c22d2e77e953456a74df80086f4f7233d\` |
| confirm 0 | \`0x1b89120e9a30d6f9df560497da077334e1d585b089a6e3d8f5721adca74d3e53\` |

## 2. 运行路线 B

\`\`\`bash
cd ~/blockchain-course/my-first-dapp
yarn install
yarn start
\`\`\`

打开 \`http://localhost:3000/escrow\`，MetaMask 切到 POTOS Testnet。

页面功能：

- 订单列表从 \`OrderCreated\` 事件重建，每 5 秒刷新。
- 创建订单、approve + deposit 一键付款、确认收货、超期退款。
- 卖家标记发货（Shipped）。
- 买家/卖家争议。
- 双仲裁：两位仲裁人分别投票，2/2 且意见一致才转账。
- 买家/卖家/仲裁人角色提示。
- 每行订单展开事件时间线。

## 3. 运行路线 A

\`\`\`bash
cd ~/blockchain-course/my-first-dapp/route-a

read -rsp "后端账户私钥（不会显示）: " WEB3J_PRIVATE_KEY
printf '\n'
export WEB3J_PRIVATE_KEY

./gradlew bootRun
\`\`\`

接口：

\`\`\`text
POST /api/escrow/deploy
POST /api/escrow/load?address=...&fromBlock=...
GET  /api/escrow/addresses
GET  /api/escrow/orders/{id}
GET  /api/escrow/orders
POST /api/escrow/orders/{id}/resolve?sellerWins=false
\`\`\`

订单列表从 \`OrderCreated\` 事件按 POTOS 的 10 区块限制分批重建；示例 \`/api/storage\` 保留用于 4A-3。

## 4. 重入攻击

合约：\`packages/hardhat/contracts/Reentrancy.sol\`  
测试：

\`\`\`bash
yarn hardhat:test --grep Reentrancy
\`\`\`

## 5. 安全

- 仓库不保存私钥；\`hardhat.config.ts\` 只从 \`__RUNTIME_DEPLOYER_PRIVATE_KEY\` 读取。
- 路线 A 使用 \`WEB3J_PRIVATE_KEY\` 环境变量。
- 提交前运行：

\`\`\`bash
rm -rf packages/hardhat/typechain-types packages/hardhat/artifacts packages/hardhat/cache
grep -rnE "0x[0-9a-fA-F]{64}" --include="*.ts" --include="*.tsx" --include="*.java" --include="*.properties" --include="*.md" . | grep -v node_modules | grep -v deployments | grep -v artifacts
git ls-files | grep -E "\\.env$"
\`\`\`

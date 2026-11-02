# 20 分加分项操作手册

目标：路线 B 基础验收 + 卖家发货 + 双仲裁 + 订单时间线 + 路线 A + 重入攻击。

当前代码已准备好：

- EscrowV2：Shipped + 双仲裁
- 一键部署页：/deploy
- 路线 A：route-a/
- 重入：Reentrancy.sol
- 页面：/escrow

---

# 一、部署 EscrowV2（不用 Remix、不用私钥）

1. 启动前端：

\`\`\`bash
cd ~/blockchain-course/my-first-dapp
yarn start
\`\`\`

2. 浏览器打开：

\`\`\`text
http://localhost:3000/deploy
\`\`\`

3. MetaMask 连接实验 3 账户 A：

\`\`\`text
0xA33E549d5FC06836fE91C41Fbbda3B5B1fAA677f
\`\`\`

4. 网络必须为 POTOS Testnet（chainId 60600）。

5. 两个仲裁人默认：

\`\`\`text
仲裁人 1：0x24e54D5AC0761c404c136aD5c79947857F7555e2（刘民强）
仲裁人 2：0xA33E549d5FC06836fE91C41Fbbda3B5B1fAA677f（李渝）
\`\`\`

6. 点“部署 EscrowV2”，MetaMask 确认一次。

7. 成功后页面会显示并自动写入：

\`\`\`text
contractAddress
transactionHash
blockNumber
\`\`\`

把这 3 个值抄到下面“数据记录”里。

如果页面提示自动写入失败，把 3 个值发我，我手动改 \`deployedContracts.ts\`。

8. 刷新：

\`\`\`text
http://localhost:3000/escrow
\`\`\`

---

# 二、路线 B 验收（同时完成卖家发货 + 双仲裁 + 时间线）

三个 MetaMask 账户：

- A 买家：0xA33E...677f（李渝）
- B 卖家：0x315a...58B3（贺定）
- C 仲裁人 1：0x24e5...5e2（刘民强）
- 仲裁人 2 也是李渝 0xA33E...677f

## 订单 0：正常流程 + 卖家发货

1. A 创建订单：
   - 卖家：B 的地址
   - 金额：30
   - 分钟：30
   - 描述：大作业订单0
2. 截图 4B-2-a：创建后的列表，状态 Created。
3. A 点“付款（approve → deposit）”。
4. 截两张 MetaMask：
   - 4B-2-b：支出上限请求（approve，30，spender 是新 Escrow）
   - 4B-2-c：交易请求（deposit，新 Escrow）
5. 付款后状态 Paid。切到 B，B 应该只看到“标记发货”和“发起争议”，没有“确认收货”。截 4B-3-b。
6. A 页面截 4B-3-a：有“确认收货”和“发起争议”。
7. B 点“标记发货”，状态 Shipped。截一张 Shipped。
8. A 点“确认收货”，状态 Completed。截订单 0 最终状态。

## 订单 1：争议 + 双仲裁

9. A 再创建订单 1：卖家 B，30，30 分钟，描述“大作业订单1”。
10. A 付款；B 点“标记发货”，状态 Shipped。
11. B 点“发起争议”，状态 Disputed。
12. 截 4B-4-a：订单 1 Disputed，B 页面没有仲裁按钮。
13. 切到 C（刘民强），打开订单 1，应看到“投票：判给卖家 / 投票：退回买家”。截 4B-4-b。
14. C 点“投票：退回买家”，票数 1/2。截 1/2。
15. 切到仲裁人 2（李渝），打开订单 1，点“投票：退回买家”，票数 2/2，状态 Refunded。
16. 截 4B-5：订单 0 Completed，订单 1 Refunded。
17. 打开第二票的 Blockscout 交易详情，截：
    - 4B-6-a：Details（From 是李渝，合约是新 Escrow，Tokens transferred 30 从 Escrow 到买家）
    - 4B-6-b：Logs（Transfer + OrderResolved）

## 订单时间线

每个订单行展开“事件时间线”：

- 订单 0：创建 → 付款 → 发货 → 确认收货
- 订单 1：创建 → 付款 → 发货 → 争议 → 两次 ArbiterVoted → OrderResolved

截一张订单 1 的时间线，作为时间线加分证据。

---

# 三、路线 A：Spring Boot + Web3j（6 分）

路线 A 必须由后端账户签名部署和 resolve，所以这里必须给后端一个私钥环境变量。
可以用实验 3 的 A 账户，也可以用一个专门的后端账户。

## 启动

\`\`\`bash
cd ~/blockchain-course/my-first-dapp/route-a

read -rsp "后端账户私钥（不会显示）: " WEB3J_PRIVATE_KEY
echo
export WEB3J_PRIVATE_KEY

./gradlew bootRun
\`\`\`

看到 \`Started Application\` 后，另开终端。

## 4A-1

截 \`route-a/src/main/resources/application.properties\`，要能看到：

\`\`\`properties
web3j.private-key=\${WEB3J_PRIVATE_KEY}
\`\`\`

## 4A-2

截生成的 Java 封装：

\`\`\`text
route-a/src/main/java/com/wetech/demo/web3j/contracts/escrow/Escrow.java
\`\`\`

要能看到 BINARY、FUNC_、内部类 Order、ORDERCREATED_EVENT、getOrderCreatedEventFromLog。

## 4A-3：示例接口先跑通

\`\`\`bash
curl -X POST http://localhost:8080/api/storage/deploy
curl -X POST "http://localhost:8080/api/storage/value/set?value=100"
curl -X GET http://localhost:8080/api/storage/value/get
\`\`\`

截三条 curl 的响应 + 区块浏览器里的 set 交易。

## 4A-5：部署 Escrow

\`\`\`bash
curl -X POST http://localhost:8080/api/escrow/deploy
curl -X GET  http://localhost:8080/api/escrow/addresses
\`\`\`

记下新的 Escrow 地址和 arbiter（应该是后端账户）。

## 4A-5/6：Remix 买卖家操作

在 Remix 用 A 的 MetaMask，At Address 加载新 Escrow：

1. createOrder(B, LYToken, 30e18, 30 分钟后的时间戳, "路线A订单0")
2. createOrder(B, LYToken, 30e18, 30 分钟后的时间戳, "路线A订单1")
3. approve(新 Escrow, 60e18)
4. deposit(0)
5. deposit(1)
6. B dispute(1)

后端查：

\`\`\`bash
curl -X GET http://localhost:8080/api/escrow/orders
curl -X GET http://localhost:8080/api/escrow/orders/0
curl -X GET http://localhost:8080/api/escrow/orders/1
\`\`\`

截 4A-6：orders 两笔 + 订单 0/1 详情。

## 4A-7：resolve 失败与成功

\`\`\`bash
# 订单 0 不是 Disputed，应失败
curl -X POST "http://localhost:8080/api/escrow/orders/0/resolve?sellerWins=true"

# 订单 1 是 Disputed，应成功
curl -X POST "http://localhost:8080/api/escrow/orders/1/resolve?sellerWins=false"
\`\`\`

截 4A-7：失败响应 + 成功响应。

## 4A-8：浏览器里的 resolve

截成功的那笔 resolve 交易，含 From、Logs、Tokens transferred。

## 收尾

A 对订单 0 confirm(0)，B 收到 30 个 LYToken。

---

# 四、重入攻击（6 分）

合约：

\`\`\`text
packages/hardhat/contracts/Reentrancy.sol
\`\`\`

Remix：

1. A 部署 VulnerableVault，记地址 V。
2. B 调 V.deposit()，value = 0.002 POT。
3. A 部署 Attacker，构造参数 V。
4. A 调 Attacker.attack()，value = 0.001 POT。
5. 截 4C-1：
   - V.vaultBalance() = 0
   - 攻击合约余额 = 0.003 POT
   - Attacker.count() = 2
6. 截 4C-2：attack 交易的 Logs，应有两条 Reentered。
7. 部署 FixedVault，B 存 0.002 POT。
8. 新 Attacker 指向 FixedVault，A 攻击 0.001 POT；交易应 revert。
9. 截 4C-3：revert + FixedVault 余额仍为 0.002 POT。

---

# 五、数据记录（做完发我）

请把下面填好发我：

\`\`\`text
【V2】
EscrowV2 地址：
部署哈希：
部署区块：

【订单 0】
createOrder：
approve：
deposit：
markShipped：
confirm：

【订单 1】
createOrder：
approve：
deposit：
markShipped：
dispute：
仲裁人1投票：
仲裁人2投票：

【路线 A】
后端账户：
Escrow 地址：
部署哈希：
createOrder 0：
deposit 0：
createOrder 1：
deposit 1：
dispute 1：
resolve 失败：
resolve 成功：
confirm 0：

【重入】
VulnerableVault：
攻击合约：
attack 哈希：
FixedVault：
第二次 attack 哈希：
\`\`\`

截图命名建议：

\`\`\`text
4B-2a/2b/2c、4B-3a/3b、4B-4a/4b、4B-5、4B-6a/6b、时间线
4A-1 ... 4A-8
4C-1 ... 4C-3
\`\`\`

---

# 六、重要说明

- 不再使用旧 Escrow 0xD289 的截图；V2 是新地址。
- 页面必须先部署 V2，再创建订单。
- 20 分需要全部做完，报告我会根据你发的新地址、哈希和截图重做。
- 所有私钥只放在终端环境变量里，不要发我、不要进仓库。

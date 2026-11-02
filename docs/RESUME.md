# 下次继续操作

## 当前进度

- 路线 B：EscrowV2 已部署，订单 0/1 已完成。
  - 订单 0：Completed（含卖家发货）
  - 订单 1：Refunded（含争议 + 两票仲裁）
- 路线 A：后端 Escrow 已部署，订单 0/1 已完成。
  - 订单 0：Completed
  - 订单 1：Refunded
- 4C 重入攻击：还没做。
- 最终报告：还没重做。

## 关键地址

### 路线 B EscrowV2
0xCF2Db535801A82f6Ac3823e1FF13C567f0B54ee4

### 路线 A Escrow
0x0f440022B9B958AC9a035E62C88658Bdf0fCf991

不要再次调用：

POST /api/escrow/deploy

否则会把后端切换到新的空合约，路线 A 数据会乱。

## 下次启动

### 前端

\`\`\`bash
cd ~/blockchain-course/my-first-dapp
yarn start
\`\`\`

打开：

http://localhost:3000/escrow

### 路线 A 后端

\`\`\`bash
cd ~/blockchain-course/my-first-dapp/route-a

read -rsp "私钥（不会显示）: " WEB3J_PRIVATE_KEY
printf '\n'
export WEB3J_PRIVATE_KEY

./gradlew bootRun
\`\`\`

看到 Started Application 后，另开终端验证：

\`\`\`bash
curl -s http://localhost:8080/api/escrow/addresses
\`\`\`

应返回：

0x0f440022B9B958AC9a035E62C88658Bdf0fCf991

如果返回别的地址，执行：

\`\`\`bash
curl -X POST "http://localhost:8080/api/escrow/load?address=0x0f440022B9B958AC9a035E62C88658Bdf0fCf991&fromBlock=2761162"
\`\`\`

## 下次只剩 4C

1. A/B 各领至少 0.01 POT。
2. Remix 部署 VulnerableVault。
3. B 存 0.002 POT。
4. A 部署 Attacker，攻击 0.001 POT。
5. 截 4C-1/4C-2。
6. 部署 FixedVault，B 存 0.002，A 攻击 0.001，交易 revert，截 4C-3。

## 文件

- v2_data.md：路线 B 哈希
- route_a_data.md：路线 A 哈希
- 截图：需要保留在本地

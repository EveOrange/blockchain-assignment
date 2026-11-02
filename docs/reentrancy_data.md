# 4C 重入攻击数据

## 第一轮 VulnerableVault
- VulnerableVault：0xa00d37b9aD1986EAb6DFd31DE6Cd94C32496Bbd0
- 部署哈希：0x84e51fdccce7b90260e9210b39b98e51534457ab11f6f6d23a4d6da6bfbfa8b4
- B deposit：0x9f33ef18a35b2653d1a49842e07af09e7752c1b542c52c4ea1e34600bb1d6ecc，区块 2770747，value 0.002 POT
- Attacker：0x82723AeBC244d9dacF4412613b62f0d2BEAFD86a
- attack：0x88b15a310045c5b382c1e51d5a54a9c015d1df38e6eb6d90ad990cfc0c81a0d7，区块 2770766，value 0.001 POT
- 结果：V 余额 0，count=2，Attacker 余额 0.003 POT
- Logs：Reentered(1, 0.002)、Reentered(2, 0.001)

## 第二轮 FixedVault
- FixedVault：0xD468D655FC9Aa43653884E33d511bB95B2ff9BC5
- 部署哈希：0x7aebc5cdca59717b1108d280aaf5d6744adfa338f9673828e79a15a96c14a4c2
- B deposit：0x0096832435465fd3f12f99df898452222e997700fe04aa869c6c76a840632d5c，区块 2770869，value 0.0006 POT
- 新 Attacker：0x2dE0bBA1Da1aec5e55ee73835b60626e3B8E2c8C
- 新 Attacker 部署哈希：0xf52b72af281bf005267a4a1b979e53f59a358014bc6a37284c3fac692843e0ff
- attack 失败：0x98cce4eec3f03aa33e3384b7c0f0fba7176730dd7666ab35bbf9bf7fd1febccb，区块 2770905，value 0.0003 POT
- 结果：FixedVault 余额仍为 0.0006 POT

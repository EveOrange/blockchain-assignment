"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { escrowV2Abi, escrowV2Bytecode } from "~~/contracts/EscrowV2Artifact";

const DEFAULT_ARBITER_1 = "0x24e54D5AC0761c404c136aD5c79947857F7555e2";
const DEFAULT_ARBITER_2 = "0xA33E549d5FC06836fE91C41Fbbda3B5B1fAA677f";

export default function DeployV2Page() {
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [arbiter1, setArbiter1] = useState(DEFAULT_ARBITER_1);
  const [arbiter2, setArbiter2] = useState(DEFAULT_ARBITER_2);
  const [status, setStatus] = useState("等待部署");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    contractAddress?: string;
    transactionHash?: string;
    blockNumber?: string;
    deployer?: string;
    chainId?: number;
    arbiter1?: string;
    arbiter2?: string;
  } | null>(null);

  const deploy = async () => {
    if (!walletClient || !publicClient || !address) {
      setStatus("请先连接 MetaMask");
      return;
    }
    if (!isAddress(arbiter1) || !isAddress(arbiter2)) {
      setStatus("两个仲裁人地址格式不正确");
      return;
    }
    if (arbiter1.toLowerCase() === arbiter2.toLowerCase()) {
      setStatus("两个仲裁人不能是同一个地址");
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      setStatus("请在 MetaMask 中确认部署交易...");
      const hash = await walletClient.deployContract({
        abi: escrowV2Abi,
        bytecode: escrowV2Bytecode,
        args: [arbiter1, arbiter2],
      });
      setStatus(`交易已发送：${hash}，等待上链确认...`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let configUpdated = false;
      if (receipt.contractAddress) {
        const response = await fetch("/api/set-v2-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: receipt.contractAddress,
            blockNumber: Number(receipt.blockNumber),
          }),
        });
        const saved = await response.json().catch(() => null);
        configUpdated = Boolean(saved?.ok);
      }

      setResult({
        contractAddress: receipt.contractAddress ?? undefined,
        transactionHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        deployer: address,
        chainId: chain?.id,
        arbiter1,
        arbiter2,
      });
      setStatus(
        configUpdated
          ? "部署成功，deployedContracts.ts 已自动更新。刷新 /escrow 即可使用。"
          : "部署成功，但自动写入配置失败；请把结果发给组长手动更新 deployedContracts.ts。",
      );
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? "部署失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="text-2xl font-bold">一键部署 EscrowV2</h1>
      <p className="mt-2 text-sm opacity-70">
        使用当前 MetaMask 账户签名部署，不需要导出私钥。部署账户会作为交易发送者；构造函数里的两个地址是仲裁人。
      </p>

      <div className="mt-4 rounded-box border border-base-300 p-4 text-sm">
        <p>当前账户：{address ?? "未连接"}</p>
        <p>当前网络：{chain?.name ?? "未知"}（chainId: {chain?.id ?? "-"}）</p>
        <p className={chain?.id === 60600 ? "text-success" : "text-warning"}>
          {chain?.id === 60600 ? "网络正确：POTOS Testnet" : "请切换到 POTOS Testnet（chainId 60600）"}
        </p>
      </div>

      <div className="mt-6 rounded-box border border-base-300 p-4">
        <h2 className="mb-3 font-bold">构造参数</h2>
        <label className="mb-1 block text-sm">仲裁人 1</label>
        <input
          className="input input-bordered mb-3 w-full font-mono text-sm"
          value={arbiter1}
          onChange={e => setArbiter1(e.target.value)}
        />
        <label className="mb-1 block text-sm">仲裁人 2</label>
        <input
          className="input input-bordered mb-3 w-full font-mono text-sm"
          value={arbiter2}
          onChange={e => setArbiter2(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={() => void deploy()}
          disabled={busy || !address || chain?.id !== 60600}
        >
          {busy ? "部署中..." : "部署 EscrowV2"}
        </button>
        <p className="mt-3 text-sm">{status}</p>
      </div>

      {result && (
        <div className="mt-6 rounded-box border border-success p-4 text-sm">
          <h2 className="mb-2 font-bold text-success">部署结果</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-base-200 p-3">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 text-xs opacity-60">
        <p>说明：这个页面只负责发送部署交易，不会读取或保存私钥。</p>
        <p>部署完成后，还需要把 EscrowV2 地址写进 packages/nextjs/contracts/deployedContracts.ts。</p>
      </div>
    </div>
  );
}

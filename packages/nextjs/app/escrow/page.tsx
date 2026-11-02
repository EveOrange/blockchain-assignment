"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Abi, type Address, type Hex, decodeEventLog, formatUnits, isAddress, parseUnits, zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const STATUS = ["Created", "Paid", "Shipped", "Completed", "Refunded", "Disputed"] as const;
const EXPLORER_API = "https://scan-testnet.potos.hk/api";
const EXPLORER_TX = "https://scan-testnet.potos.hk/tx";
const FALLBACK_DEPLOY_BLOCK = 2672896;

type EscrowEvent = {
  eventName: string;
  args: any;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hex;
  timestamp: number;
};

const lower = (value?: string) => value?.toLowerCase() ?? "";

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function eventLabel(event: EscrowEvent) {
  const args = event.args ?? {};
  switch (event.eventName) {
    case "OrderCreated":
      return `创建订单 #${args.id?.toString()}，金额 ${formatUnits(BigInt(args.amount ?? 0), 18)} 个`;
    case "OrderPaid":
      return "买家付款，代币进入 Escrow";
    case "OrderShipped":
      return "卖家已发货";
    case "OrderCompleted":
      return "确认收货 / 判给卖家，代币转给卖家";
    case "OrderRefunded":
      return "退款，代币退回买家";
    case "OrderDisputed":
      return `发起争议（${args.by ?? "未知账户"}）`;
    case "ArbiterVoted":
      return `仲裁人投票（${args.arbiter}，${args.sellerWins ? "判给卖家" : "退回买家"}，${args.votes}/2）`;
    case "OrderResolved":
      return args.sellerWins ? "仲裁：判给卖家" : "仲裁：退回买家";
    default:
      return event.eventName;
  }
}

/**
 * POTOS 的 eth_getLogs 一次最多返回 fromBlock 起 10 个区块的日志。
 * Escrow 部署在 2,672,896，当前链头已经超过 2,750,000；若用
 * useScaffoldEventHistory 从部署块按 10 个区块回放，需要上万次 RPC。
 * 因此这里用 Blockscout 的 logs API 一次取回完整事件历史，仍然按事件重建订单；
 * 每 5 秒轮询一次，保证别人直接在 Remix 创建的订单也能出现。
 */
function useEscrowEvents(address?: string, abi?: Abi, fromBlock?: number) {
  const [events, setEvents] = useState<EscrowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!address || !abi) return;
      if (!silent) setLoading(true);
      try {
        const start = fromBlock ?? FALLBACK_DEPLOY_BLOCK;
        const url = `${EXPLORER_API}?module=logs&action=getLogs&fromBlock=${start}&toBlock=latest&address=${address}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Blockscout HTTP ${response.status}`);
        const json = await response.json();
        if (!Array.isArray(json.result)) {
          if (
            String(json.message ?? "")
              .toLowerCase()
              .includes("no logs")
          ) {
            setEvents([]);
            setError(null);
            return;
          }
          throw new Error(json.message || "Blockscout 返回格式错误");
        }

        const decoded: EscrowEvent[] = [];
        for (const log of json.result) {
          try {
            const topics = (log.topics as (Hex | null)[]).filter((topic): topic is Hex => Boolean(topic));
            const result = decodeEventLog({
              abi,
              data: log.data as Hex,
              topics: topics as [Hex, ...Hex[]],
            });
            decoded.push({
              eventName: String((result as any).eventName ?? ""),
              args: result.args as any,
              blockNumber: BigInt(log.blockNumber),
              logIndex: parseInt(log.logIndex, 16),
              transactionHash: log.transactionHash as Hex,
              timestamp: log.timeStamp ? parseInt(log.timeStamp, 16) : 0,
            });
          } catch {
            // 忽略不属于当前 ABI 的日志
          }
        }

        decoded.sort((a, b) =>
          a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1,
        );
        setEvents(decoded);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "读取链上事件失败");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [address, abi, fromBlock],
  );

  useEffect(() => {
    if (!address || !abi) return;
    void load(false);
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [address, abi, load]);

  return { events, loading, error, refresh: () => load(false) };
}

export default function EscrowPage() {
  const { address } = useAccount();
  const { data: arbiter1 } = useScaffoldReadContract({
    contractName: "EscrowV2",
    functionName: "arbiter1",
  });
  const { data: arbiter2 } = useScaffoldReadContract({
    contractName: "EscrowV2",
    functionName: "arbiter2",
  });
  const { data: escrowInfo } = useDeployedContractInfo({ contractName: "EscrowV2" });
  const { data: tokenInfo } = useDeployedContractInfo({ contractName: "LYToken" });
  const { writeContractAsync: writeEscrow } = useScaffoldWriteContract({ contractName: "EscrowV2" });
  const { writeContractAsync: writeToken } = useScaffoldWriteContract({ contractName: "LYToken" });

  const escrowAddress = escrowInfo?.address;
  const tokenAddress = tokenInfo?.address;
  const deployBlock = (escrowInfo as any)?.deployedOnBlock as number | undefined;
  const { events, loading, error, refresh } = useEscrowEvents(
    escrowAddress,
    escrowInfo?.abi as Abi | undefined,
    deployBlock,
  );

  const createdEvents = useMemo(() => events.filter(event => event.eventName === "OrderCreated"), [events]);
  const orderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of createdEvents) {
      if (event.args?.id !== undefined) ids.add(event.args.id.toString());
    }
    return Array.from(ids)
      .map(id => BigInt(id))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }, [createdEvents]);

  const eventsByOrder = useMemo(() => {
    const map = new Map<string, EscrowEvent[]>();
    for (const event of events) {
      if (event.args?.id === undefined) continue;
      const key = event.args.id.toString();
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const isArbiter = Boolean(address) && (lower(address) === lower(arbiter1) || lower(address) === lower(arbiter2));
  const buyerCount = createdEvents.filter(event => lower(event.args?.buyer) === lower(address)).length;
  const sellerCount = createdEvents.filter(event => lower(event.args?.seller) === lower(address)).length;
  const roleText = !address
    ? "未连接"
    : [
        ...(isArbiter ? ["仲裁人（多签）"] : []),
        ...(buyerCount > 0 ? [`买家（${buyerCount} 笔）`] : []),
        ...(sellerCount > 0 ? [`卖家（${sellerCount} 笔）`] : []),
      ].join(" / ") || "旁观者";

  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [deadlineMinutes, setDeadlineMinutes] = useState("30");
  const [description, setDescription] = useState("大作业订单");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setFormError(null);
    if (!address) return setFormError("请先连接 MetaMask");
    if (!isAddress(seller)) return setFormError("卖家地址格式不正确");
    if (!escrowAddress) return setFormError("Escrow 地址未加载");
    if (!tokenAddress) return setFormError("LYToken 地址未加载");

    const amountNumber = Number(amount);
    const minutes = Number(deadlineMinutes);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return setFormError("金额必须大于 0");
    if (!Number.isInteger(minutes) || minutes <= 0) return setFormError("到期分钟数必须是正整数");
    if (!description.trim()) return setFormError("描述不能为空");

    setCreating(true);
    try {
      const amountWei = parseUnits(amount, 18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
      await writeEscrow({
        functionName: "createOrder",
        args: [seller as Address, tokenAddress as Address, amountWei, deadline, description.trim()],
      });
      setAmount("");
      window.setTimeout(() => void refresh(), 1500);
    } catch (e: any) {
      setFormError(e?.shortMessage ?? e?.message ?? "创建订单失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Escrow 托管交易</h1>
          <p className="text-sm opacity-70">订单列表由链上 OrderCreated / OrderPaid / ... 事件重建</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline">当前账户：{address ? shortHash(address) : "未连接"}</span>
          <span className="badge badge-outline">你的角色：{roleText}</span>
          <span className="badge badge-outline">订单总数：{orderIds.length}</span>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>仲裁人 1：{arbiter1 ?? "加载中..."}</span>
        <span>仲裁人 2：{arbiter2 ?? "加载中..."}</span>
        <span>Escrow：{escrowAddress ? shortHash(escrowAddress) : "加载中..."}</span>
        <span>LYToken：{tokenAddress ? shortHash(tokenAddress) : "加载中..."}</span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button className="btn btn-xs btn-outline" onClick={() => void refresh()} disabled={loading}>
          {loading ? "刷新中..." : "刷新事件"}
        </button>
        {error && <span className="text-xs text-error">{error}（页面保留上一次成功结果）</span>}
      </div>

      <div className="mb-8 rounded-box border border-base-300 p-4">
        <h2 className="mb-3 font-bold">创建订单</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="input input-bordered w-full"
            placeholder="卖家地址 0x..."
            value={seller}
            onChange={e => setSeller(e.target.value)}
          />
          <input
            className="input input-bordered w-full"
            placeholder="金额（个，按 18 位精度换算）"
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <input
            className="input input-bordered w-full"
            placeholder="多少分钟后到期"
            type="number"
            min="1"
            step="1"
            value={deadlineMinutes}
            onChange={e => setDeadlineMinutes(e.target.value)}
          />
          <input
            className="input input-bordered w-full"
            placeholder="描述"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => void handleCreate()} disabled={creating}>
            {creating ? "创建中..." : "创建订单"}
          </button>
          <span className="text-xs opacity-60">
            代币：{tokenAddress ?? "未加载"}；金额会先换算成 18 位精度，截止时间会换算成 Unix 时间戳。
          </span>
        </div>
        {formError && <p className="mt-2 text-sm text-error">{formError}</p>}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">订单列表</h2>
        <span className="text-xs opacity-60">每 5 秒从链上事件刷新一次</span>
      </div>

      {loading && orderIds.length === 0 ? (
        <div className="rounded-box border border-base-300 p-6 text-sm opacity-70">正在从链上事件重建订单列表...</div>
      ) : orderIds.length === 0 ? (
        <div className="rounded-box border border-base-300 p-6 text-sm opacity-70">暂无订单</div>
      ) : (
        orderIds.map(id => (
          <OrderRow
            key={id.toString()}
            id={id}
            address={address}
            arbiter1={arbiter1}
            arbiter2={arbiter2}
            writeEscrow={writeEscrow}
            writeToken={writeToken}
            escrowAddress={escrowAddress}
            orderEvents={eventsByOrder.get(id.toString()) ?? []}
            onRefresh={refresh}
          />
        ))
      )}
    </div>
  );
}

function OrderRow({
  id,
  address,
  arbiter1,
  arbiter2,
  writeEscrow,
  writeToken,
  escrowAddress,
  orderEvents,
  onRefresh,
}: {
  id: bigint;
  address?: string;
  arbiter1?: string;
  arbiter2?: string;
  writeEscrow: any;
  writeToken: any;
  escrowAddress?: string;
  orderEvents: EscrowEvent[];
  onRefresh: () => Promise<void>;
}) {
  const { data: order } = useScaffoldReadContract({
    contractName: "EscrowV2",
    functionName: "getOrder",
    args: [id],
  });
  const { data: voteCount } = useScaffoldReadContract({
    contractName: "EscrowV2",
    functionName: "voteCount",
    args: [id],
  });
  const { data: voteSellerWins } = useScaffoldReadContract({
    contractName: "EscrowV2",
    functionName: "voteSellerWins",
    args: [id],
  });
  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "EscrowV2",
    functionName: "hasVoted",
    args: [id, (address ?? zeroAddress) as Address],
  });
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const isBuyer = lower(address) === lower(order.buyer);
  const isSeller = lower(address) === lower(order.seller);
  const isArbiter1 = lower(address) === lower(arbiter1);
  const isArbiter2 = lower(address) === lower(arbiter2);
  const isArbiter = isArbiter1 || isArbiter2;
  const statusText = STATUS[Number(order.status)] ?? "Unknown";
  const role = isBuyer && isSeller
    ? "买家/卖家"
    : isBuyer
      ? "买家"
      : isSeller
        ? "卖家"
        : isArbiter1
          ? "仲裁人 1"
          : isArbiter2
            ? "仲裁人 2"
            : "旁观者";
  const expired = BigInt(Math.floor(Date.now() / 1000)) > order.deadline;
  const deadlineText = new Date(Number(order.deadline) * 1000).toLocaleString("zh-CN", { hour12: false });
  const votes = Number(voteCount ?? 0);
  const voted = Boolean(hasVoted);
  const activeProposal = votes > 0 ? (voteSellerWins ? "判给卖家" : "退回买家") : "尚未投票";

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      window.setTimeout(() => void onRefresh(), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleDeposit = () =>
    run(async () => {
      if (!escrowAddress) throw new Error("Escrow 地址未加载");
      await writeToken({ functionName: "approve", args: [escrowAddress as Address, order.amount] });
      await writeEscrow({ functionName: "deposit", args: [id] });
    });

  const handleShip = () => run(() => writeEscrow({ functionName: "markShipped", args: [id] }));
  const handleConfirm = () => run(() => writeEscrow({ functionName: "confirm", args: [id] }));
  const handleDispute = () => run(() => writeEscrow({ functionName: "dispute", args: [id] }));
  const handleRefund = () => run(() => writeEscrow({ functionName: "refund", args: [id] }));
  const handleResolve = (sellerWins: boolean) =>
    run(() => writeEscrow({ functionName: "resolve", args: [id, sellerWins] }));

  return (
    <div className="mb-4 rounded-box border border-base-300 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-base">订单 #{id.toString()}</b>
            <span
              className={`badge ${statusText === "Paid" ? "badge-info" : statusText === "Shipped" ? "badge-accent" : statusText === "Disputed" ? "badge-warning" : statusText === "Completed" ? "badge-success" : statusText === "Refunded" ? "badge-error" : "badge-ghost"}`}
            >
              {statusText}
            </span>
            <span className="badge badge-outline">我的角色：{role}</span>
          </div>
          <p className="break-all">买家：{order.buyer}</p>
          <p className="break-all">卖家：{order.seller}</p>
          <p>金额：{formatUnits(order.amount, 18)} 个</p>
          <p>
            截止：{deadlineText}
            {expired ? "（已过期）" : ""}
          </p>
          <p>描述：{order.description}</p>
          {statusText === "Disputed" && (
            <p className="text-warning">
              仲裁票数：{votes}/2；当前提案：{activeProposal}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {isBuyer && statusText === "Created" && (
            <button className="btn btn-primary btn-sm" onClick={() => void handleDeposit()} disabled={busy}>
              {busy ? "处理中..." : "付款（approve → deposit）"}
            </button>
          )}
          {isSeller && statusText === "Paid" && (
            <button className="btn btn-secondary btn-sm" onClick={() => void handleShip()} disabled={busy}>
              标记发货
            </button>
          )}
          {isBuyer && (statusText === "Paid" || statusText === "Shipped") && (
            <button className="btn btn-success btn-sm" onClick={() => void handleConfirm()} disabled={busy}>
              确认收货
            </button>
          )}
          {isBuyer && statusText === "Paid" && expired && (
            <button className="btn btn-outline btn-sm" onClick={() => void handleRefund()} disabled={busy}>
              超期退款
            </button>
          )}
          {(isBuyer || isSeller) && (statusText === "Paid" || statusText === "Shipped") && (
            <button className="btn btn-warning btn-sm" onClick={() => void handleDispute()} disabled={busy}>
              发起争议
            </button>
          )}
          {isArbiter && statusText === "Disputed" && (
            <>
              {voted ? (
                <p className="text-xs text-success">你已投票，等待另一仲裁人</p>
              ) : (
                <>
                  <button className="btn btn-success btn-sm" onClick={() => void handleResolve(true)} disabled={busy}>
                    投票：判给卖家
                  </button>
                  <button className="btn btn-error btn-sm" onClick={() => void handleResolve(false)} disabled={busy}>
                    投票：退回买家
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">事件时间线（{orderEvents.length}）</summary>
        <ol className="mt-2 space-y-2 border-l-2 border-base-300 pl-4">
          {orderEvents.map(event => (
            <li key={`${event.transactionHash}-${event.logIndex}`}>
              <div className="text-xs opacity-60">
                {event.timestamp
                  ? new Date(event.timestamp * 1000).toLocaleString("zh-CN", { hour12: false })
                  : "时间未知"}
                {" · "}区块 {event.blockNumber.toString()}
              </div>
              <div className="text-sm">{eventLabel(event)}</div>
              <a
                className="link text-xs"
                href={`${EXPLORER_TX}/${event.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortHash(event.transactionHash)}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

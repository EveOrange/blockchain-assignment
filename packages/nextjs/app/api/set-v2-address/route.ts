import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "dev only" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const address = body?.address;
  const blockNumber = Number(body?.blockNumber);

  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ ok: false, error: "invalid address" }, { status: 400 });
  }
  if (!Number.isInteger(blockNumber) || blockNumber < 0) {
    return NextResponse.json({ ok: false, error: "invalid block" }, { status: 400 });
  }

  const candidates = [
    path.join(process.cwd(), "contracts", "deployedContracts.ts"),
    path.join(process.cwd(), "packages", "nextjs", "contracts", "deployedContracts.ts"),
  ];

  for (const file of candidates) {
    try {
      let source = await fs.readFile(file, "utf8");
      if (!source.includes("EscrowV2:")) continue;

      // 只在 EscrowV2 这一块里替换 address 和 deployedOnBlock
      const start = source.indexOf("EscrowV2:");
      const next = source.indexOf("LYToken:", start);
      const end = next === -1 ? source.length : next;
      let block = source.slice(start, end);
      block = block.replace(/address:\s*"0x[0-9a-fA-F]{40}"/, `address: "${address}"`);
      block = block.replace(/deployedOnBlock:\s*\d+/, `deployedOnBlock: ${blockNumber}`);
      source = source.slice(0, start) + block + source.slice(end);
      await fs.writeFile(file, source, "utf8");

      return NextResponse.json({ ok: true, file });
    } catch {
      // try next path
    }
  }

  return NextResponse.json({ ok: false, error: "deployedContracts.ts not found" }, { status: 404 });
}

import axios from "axios";
import { getChain, type ChainConfig } from "../../config/chains";
import { env } from "../../config/environment";
import type { ExplorerContractInfo } from "../../shared/types/addressScan";
import { isContractBytecode, normalizeAddress } from "./addressValidation";

interface EtherscanSourceResult {
  SourceCode: string;
  ContractName: string;
  ABI: string;
  CompilerVersion: string;
  Proxy: string;
  Implementation: string;
}

function resolveApiKey(chain: ChainConfig): string | undefined {
  const keyMap: Record<string, string | undefined> = {
    ETHERSCAN_API_KEY: env.ETHERSCAN_API_KEY,
    BSCSCAN_API_KEY: env.BSCSCAN_API_KEY,
    BASESCAN_API_KEY: env.BASESCAN_API_KEY,
    ARBISCAN_API_KEY: env.ARBISCAN_API_KEY,
    POLYGONSCAN_API_KEY: env.POLYGONSCAN_API_KEY,
    OPTIMISM_API_KEY: env.OPTIMISM_API_KEY,
    SNOWTRACE_API_KEY: env.SNOWTRACE_API_KEY,
  };
  const specific = keyMap[chain.apiKeyEnv];
  if (specific) return specific;
  return env.ETHERSCAN_API_KEY;
}

async function explorerGet<T>(
  chain: ChainConfig,
  params: Record<string, string>,
): Promise<T> {
  const apiKey = resolveApiKey(chain);
  const query: Record<string, string> = { ...params, apikey: apiKey || "" };

  if (chain.explorerKind === "etherscan-v2") {
    query.chainid = String(chain.id);
  }

  const { data } = await axios.get<{ status: string; message: string; result: T }>(
    chain.explorerApiUrl,
    {
      params: query,
      timeout: 25000,
    },
  );

  if (data.status !== "1" && data.message !== "OK") {
    throw new Error(data.message || "Explorer API request failed");
  }

  return data.result;
}

function unwrapSourceCode(raw: string): string {
  if (!raw || raw === "Contract source code not verified") {
    return "";
  }
  if (raw.startsWith("{{")) {
    try {
      const inner = JSON.parse(raw.slice(1, -1));
      const sources = inner.sources as Record<string, { content: string }>;
      return Object.values(sources)
        .map((s) => s.content)
        .join("\n\n");
    } catch {
      return raw;
    }
  }
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.sources) {
        return Object.values(parsed.sources as Record<string, { content: string }>)
          .map((s) => s.content)
          .join("\n\n");
      }
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function fetchContractFromExplorer(
  chainId: number,
  addressInput: string,
): Promise<ExplorerContractInfo> {
  const chain = getChain(chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  const address = normalizeAddress(addressInput);
  const explorerUrl = `${chain.explorerWebUrl}/address/${address}`;

  let bytecode = "0x";
  try {
    bytecode = await explorerGet<string>(chain, {
      module: "proxy",
      action: "eth_getCode",
      address,
      tag: "latest",
    });
  } catch {
    bytecode = "0x";
  }

  if (!isContractBytecode(bytecode)) {
    return {
      address,
      chainId,
      hasBytecode: false,
      contractName: null,
      isVerified: false,
      isProxy: false,
      implementationAddress: null,
      compilerVersion: null,
      sourceCode: null,
      abi: null,
      explorerUrl,
    };
  }

  let sourceRow: EtherscanSourceResult | undefined;
  try {
    const rows = await explorerGet<EtherscanSourceResult[]>(chain, {
      module: "contract",
      action: "getsourcecode",
      address,
    });
    sourceRow = rows?.[0];
  } catch {
    sourceRow = undefined;
  }

  const rawSource = sourceRow?.SourceCode ?? "";
  const sourceCode = unwrapSourceCode(rawSource);
  const isVerified = sourceCode.length > 0;
  const isProxy = sourceRow?.Proxy === "1";
  const implementationAddress =
    isProxy && sourceRow?.Implementation
      ? normalizeAddress(sourceRow.Implementation)
      : null;

  return {
    address,
    chainId,
    hasBytecode: true,
    contractName: sourceRow?.ContractName || null,
    isVerified,
    isProxy,
    implementationAddress,
    compilerVersion: sourceRow?.CompilerVersion || null,
    sourceCode: isVerified ? sourceCode : null,
    abi:
      sourceRow?.ABI && sourceRow.ABI !== "Contract source code not verified"
        ? sourceRow.ABI
        : null,
    explorerUrl,
  };
}

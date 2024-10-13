import { SUPPORT_CHAIN_IDS } from "./enum";

export const SH_FACTORY_ADDRESS: { [chainId: number]: string } = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"0x4DBE3C9941CeBEe72bBCA8a56AA3a380E825dDb1",
};

export const SUPPORT_CHAINS = [
  SUPPORT_CHAIN_IDS.ARBITRUM,
];

export const RPC_PROVIDERS: {[chainId: number]: string} = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"https://arb1.arbitrum.io/rpc",
  // [SUPPORT_CHAIN_IDS.ARBITRUM]:"https://site1.moralis-nodes.com/arbitrum/b7337e4749f147acbc6c199c28ef4bc4"
};

export const DECIMAL: { [chainId: number]: number } = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]: 6,
};




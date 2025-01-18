import { SUPPORT_CHAIN_IDS } from "./enum";

export const SH_FACTORY_ADDRESS: { [chainId: number]: string } = {
  // [SUPPORT_CHAIN_IDS.ARBITRUM]:"0xE60d4B5cdB112A7DC14CAa954acba2C6254D0cA6", // Dev
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"0x2Cc4BcfBFF295131ae0f3aA5c2C822a68d6489dd", // Staging
  [SUPPORT_CHAIN_IDS.MAINNET]:"0x1De27e7C8E7b7d5fb98969945686D578dEFd4c1c", // Production
};

export const SUPPORT_CHAINS = [
  SUPPORT_CHAIN_IDS.ARBITRUM,
  SUPPORT_CHAIN_IDS.MAINNET
];

export const RPC_PROVIDERS: {[chainId: number]: string} = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"https://arb1.arbitrum.io/rpc",
  [SUPPORT_CHAIN_IDS.MAINNET]:"https://eth.llamarpc.com"
  // [SUPPORT_CHAIN_IDS.ARBITRUM]:"https://site1.moralis-nodes.com/arbitrum/b7337e4749f147acbc6c199c28ef4bc4"
};

export const DECIMAL: { [chainId: number]: number } = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]: 6,
  [SUPPORT_CHAIN_IDS.MAINNET]: 18
};




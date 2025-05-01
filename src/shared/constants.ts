import { SUPPORT_CHAIN_IDS } from "./enum";

export const SH_FACTORY_ADDRESS: { [chainId: number]: string[] } = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]:[
    process.env.FACTORY_ADDRESS_ARBITRUM as string
  ], // Staging
  [SUPPORT_CHAIN_IDS.MAINNET]:[
    process.env.FACTORY_ADDRESS_MAINNET as string
  ], // Production
  [SUPPORT_CHAIN_IDS.BASE]:[
    process.env.FACTORY_ADDRESS_BASE as string
  ], // Production
};

export const SUPPORT_CHAINS = [
  SUPPORT_CHAIN_IDS.ARBITRUM,
  SUPPORT_CHAIN_IDS.MAINNET,
  SUPPORT_CHAIN_IDS.BASE,
];

export const RPC_PROVIDERS: {[chainId: number]: string} = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]: process.env.RPC_PROVIDER_ARBITRUM as string,
  [SUPPORT_CHAIN_IDS.MAINNET]: process.env.RPC_PROVIDER_MAINNET as string,
  [SUPPORT_CHAIN_IDS.BASE]: process.env.RPC_PROVIDER_BASE as string,
};

export const DECIMAL: { [chainId: number]: number } = {
  [SUPPORT_CHAIN_IDS.ARBITRUM]: 6,
  [SUPPORT_CHAIN_IDS.MAINNET]: 18,
  [SUPPORT_CHAIN_IDS.BASE]: 18,
};
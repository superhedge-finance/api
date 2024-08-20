import { SUPPORT_CHAIN_IDS } from "./enum";

export const SH_FACTORY_ADDRESS: { [chainId: number]: string } = {
  [SUPPORT_CHAIN_IDS.GOERLI]: "0x132f98F50c030020fa01C54e72f470ae7374b87F",
  [SUPPORT_CHAIN_IDS.MOONBEAM_ALPHA]: "0x467b31Caa1f26bCe5aE09C2b629026eE03C34C07",
  [SUPPORT_CHAIN_IDS.ARBITRUM_GOERLI]: "0xA0e7847bDBc15e9D193132da69C92214B845EA33",
  [SUPPORT_CHAIN_IDS.MANTLE_TESTNET]: "0xC8187F7713e99B3Dd169C6818d297B1014Be9876",
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"0x14bb677B6Cfaf086c51ae24b540cc9e18307Fbd9",
};

export const MARKETPLACE_ADDRESS: { [chainId: number]: string } = {
  [SUPPORT_CHAIN_IDS.GOERLI]: "0xbBA5bf9bce64A23C7d460513a759905b51ecC0AA",
  [SUPPORT_CHAIN_IDS.MOONBEAM_ALPHA]: "0x1104dfa78a525009145d84dce9eb559ec15aba70",
  [SUPPORT_CHAIN_IDS.ARBITRUM_GOERLI]: "0x18649FfD8B3c3392bEc2B8413E9a09C559170E22",
  [SUPPORT_CHAIN_IDS.MANTLE_TESTNET]: "0x334E9874Fab7Ef1f8b5f44f8fFa9cEeB45cDB8D6",
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"0x1aE6794a97Ab36c577687432852374Fbe17b04F5",
};

export const NFT_ADDRESS: { [chainId: number]: string } = {
  [SUPPORT_CHAIN_IDS.GOERLI]: "0xC21d745013cB1A8fa6Fa6575D842524650f0F610",
  [SUPPORT_CHAIN_IDS.MOONBEAM_ALPHA]: "0x9CC080062ddd770ef30C7a33a5764174FB6d022C",
  [SUPPORT_CHAIN_IDS.ARBITRUM_GOERLI]: "0x3248b7280C7e741e171306ac5b278D2739a1f7B2",
  [SUPPORT_CHAIN_IDS.MANTLE_TESTNET]: "0xF4dd2b016e0914388BbBCf47A04683F41006de59",
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"0x585Bf48e3Bf873347249f255C9F2b1089B9902C6",
};

export const SUPPORT_CHAINS = [
  SUPPORT_CHAIN_IDS.GOERLI, 
  SUPPORT_CHAIN_IDS.MOONBEAM_ALPHA, 
  SUPPORT_CHAIN_IDS.ARBITRUM_GOERLI,
  SUPPORT_CHAIN_IDS.MANTLE_TESTNET,
  SUPPORT_CHAIN_IDS.ARBITRUM,
];

export const RPC_PROVIDERS: {[chainId: number]: string} = {
  [SUPPORT_CHAIN_IDS.GOERLI]: "https://goerli.blockpi.network/v1/rpc/public",
  [SUPPORT_CHAIN_IDS.MOONBEAM_ALPHA]: "https://rpc.api.moonbase.moonbeam.network",
  [SUPPORT_CHAIN_IDS.ARBITRUM_GOERLI]: "https://goerli-rollup.arbitrum.io/rpc",
  [SUPPORT_CHAIN_IDS.MANTLE_TESTNET]: "https://rpc.testnet.mantle.xyz",
  // [SUPPORT_CHAIN_IDS.ARBITRUM]:"https://arb1.arbitrum.io/rpc",
  [SUPPORT_CHAIN_IDS.ARBITRUM]:"https://site1.moralis-nodes.com/arbitrum/b7337e4749f147acbc6c199c28ef4bc4"
};

export const DECIMAL: { [chainId: number]: number } = {
  [SUPPORT_CHAIN_IDS.GOERLI]: 6,
  [SUPPORT_CHAIN_IDS.MOONBEAM_ALPHA]: 18,
  [SUPPORT_CHAIN_IDS.ARBITRUM_GOERLI]: 6,
  [SUPPORT_CHAIN_IDS.MANTLE_TESTNET]: 6,
  [SUPPORT_CHAIN_IDS.ARBITRUM]: 6,
};




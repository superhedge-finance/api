// GraphQL Client setup
// const GRAPHQL_API_HOST = 'https://subgraph.satsuma-prod.com/9db48de8d12d/superhedge--971465/SHFactory/api';
const GRAPHQL_API_HOST = 'https://subgraph.satsuma-prod.com/9db48de8d12d/superhedge--971465/SHFactoryETH/api'

// Dynamic import for graphql-request to handle ES module
let graphqlClient: any = null;

// Initialize GraphQL client
async function initializeGraphQLClient() {
  if (!graphqlClient) {
    try {
      // Use dynamic import to avoid ES module issues
      const { GraphQLClient } = await import('graphql-request');
      graphqlClient = new GraphQLClient(GRAPHQL_API_HOST);
    } catch (error) {
      console.error('Failed to initialize GraphQL client:', error);
      throw error;
    }
  }
  return graphqlClient;
}

// Constants
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Type definitions
interface Product {
  id: string;
  address: string;
  name: string;
  underlying: string;
  maxCapacity: string;
  totalVolume: string;
  totalVolumeUSD: string;
  totalOrders: string;
  totalUsers: string;
  totalDeposits: string;
  totalWithdrawals: string;
  status: string;
  lastStatusUpdate: string;
  createdAt: string;
  updatedAt: string;
  currency?: string;
  manager?: string;
  exWallet?: string;
  router?: string;
  market?: string;
  coupon?: string;
  strikePrice1?: string;
  strikePrice2?: string;
  strikePrice3?: string;
  strikePrice4?: string;
  tr1?: string;
  tr2?: string;
  issuanceDate?: string;
  maturityDate?: string;
  apy?: string;
  underlyingSpotRef?: string;
  optionMinOrderSize?: string;
  subAccountId?: string;
  participation?: string;
}

interface User {
  id: string;
  address: string;
  totalDeposits: string;
  totalWithdrawals: string;
  totalCoupons: string;
  totalOptions: string;
  lifetimeVolume: string;
  lifetimeVolumeUSD: string;
  firstSeen?: string;
  lastSeen?: string;
}

interface ProductUser {
  id: string;
  product: Product;
  user: User;
  totalDeposits: string;
  totalWithdrawals: string;
  totalCoupons: string;
  totalOptions: string;
  currentBalance: string;
  firstDeposit: string;
  lastActivity: string;
}

interface Deposit {
  id: string;
  product: string | Product;
  user: string | User;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface Withdrawal {
  id: string;
  product: string | Product;
  user: string | User;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface Coupon {
  id: string;
  product: string | Product;
  user: string | User;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface Option {
  id: string;
  product: string | Product;
  user: string | User;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface StatusEvent {
  id: string;
  product: string | Product;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface TokenVolumeStat {
  id: string;
  token: {
    id: string;
    address: string;
    totalVolume: string;
    totalVolumeUSD: string;
  };
  timePeriod: string;
  isoTime: string;
  tokenVolume: string;
}

interface CombinedStatsResponse {
  products: Product[];
  tokenVolumeStats: TokenVolumeStat[];
  deposits: Deposit[];
}

interface TotalDepositsResponse {
  totalAmount: string;
}

// GraphQL Queries for Products
const productUsersQuery = `
  query GetProductUsers($first: Int!, $skip: Int!, $product: String!) {
    productUsers(
      first: $first
      skip: $skip
      where: { product: $product }
      orderBy: lastActivity
      orderDirection: desc
    ) {
      id
      product {
        id
        address
        name
        underlying
        maxCapacity
        totalVolume
        totalVolumeUSD
        totalUsers
        totalDeposits
        totalWithdrawals
        currentStatus
        lastStatusUpdate
      }
      user {
        id
        address
        totalDeposits
        totalWithdrawals
        totalCoupons
        totalOptions
        lifetimeVolume
        lifetimeVolumeUSD
      }
      totalDeposits
      totalWithdrawals
      totalCoupons
      totalOptions
      currentBalance
      firstDeposit
      lastActivity
    }
  }
`;

const getProductUserCountQuery = `
  query GetProductUserCount($product: String!) {
    productUsers(where: { product: $product }) {
      id
    }
  }
`;

const getLatestDepositsQuery = `
  query GetLatestDeposits($user: String!, $product: String!) {
    deposits(
      first: 1
      where: { user: $user, product: $product }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      product
      user
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const getCombinedProductsAndVolumeStatsQuery = `
  query GetCombinedProductsAndVolumeStats($addresses: [String!]!) {
    products(where: { address_in: $addresses }) {
      id
      address
      name
      underlying
      maxCapacity
      totalVolume
      totalVolumeUSD
      totalOrders
      totalUsers
      totalDeposits
      totalWithdrawals
      status
      lastStatusUpdate
      createdAt
      updatedAt
    }
    tokenVolumeStats(
      where: { token_in: $addresses }
      orderBy: isoTime
      orderDirection: desc
      first: 100
    ) {
      id
      token {
        id
        address
        totalVolume
        totalVolumeUSD
      }
      timePeriod
      isoTime
      tokenVolume
    }
    deposits(
      where: { product_in: $addresses }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 100
    ) {
      id
      product
      user
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const getAllDepositsByUserQuery = `
  query GetAllDepositsByUser($user: String!, $product: String!) {
    deposits(
      where: { user: $user, product: $product }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      product
      user
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const getAllDepositsByUserOnlyQuery = `
  query GetAllDepositsByUserOnly($user: String!) {
    deposits(
      where: { user: $user }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      product
      user
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

// Utility function for retry logic
async function retryRequest<T>(requestFn: () => Promise<T>, attempt: number = 1): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    if (error.response?.status === 429 && attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`Rate limit exceeded (attempt ${attempt}). Retrying after ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(requestFn, attempt + 1);
    }
    throw error;
  }
}

// API Functions
class SubgraphAPI {
  constructor() {
    // Initialize client will be done in each method
  }

  private async getClient() {
    return await initializeGraphQLClient();
  }

  async getProductUsers(page: number = 0, limit: number = 10, product: string): Promise<ProductUser[]> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(productUsersQuery, {
          first: limit,
          skip: page,
          product,
        })
      );
      
      return (data as { productUsers: ProductUser[] }).productUsers;
    } catch (error) {
      console.error('Error fetching product users:', error);
      throw error;
    }
  }

  async getProductUserCount(productAddress: string): Promise<number> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(getProductUserCountQuery, {
          product: productAddress,
        })
      );
      
      return (data as { productUsers: { id: string }[] }).productUsers.length;
    } catch (error) {
      console.error('Error fetching product user count:', error);
      throw error;
    }
  }

  async getLatestDeposits(user: string, product: string): Promise<Deposit | null> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(getLatestDepositsQuery, {
          user,
          product,
        })
      );
      
      return (data as { deposits: Deposit[] }).deposits[0] || null;
    } catch (error) {
      console.error('Error fetching latest deposits:', error);
      throw error;
    }
  }

  async getCombinedProductsAndVolumeStats(addresses: string[]): Promise<CombinedStatsResponse> {
    if (!addresses || addresses.length === 0) {
      return {
        products: [],
        tokenVolumeStats: [],
        deposits: [],
      };
    }

    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(getCombinedProductsAndVolumeStatsQuery, { addresses })
      );
      
      const typedData = data as CombinedStatsResponse;
      return {
        products: typedData.products || [],
        tokenVolumeStats: typedData.tokenVolumeStats || [],
        deposits: typedData.deposits || [],
      };
    } catch (error) {
      console.error('Error fetching combined stats:', error);
      throw error;
    }
  }

  async getTotalDepositsByUser(user: string, product: string | null = null): Promise<TotalDepositsResponse> {
    try {
      const client = await this.getClient();
      let data: { deposits: Deposit[] };
      
      if (product) {
        data = await retryRequest(() =>
          client.request(getAllDepositsByUserQuery, {
            user,
            product,
          })
        );
      } else {
        data = await retryRequest(() =>
          client.request(getAllDepositsByUserOnlyQuery, {
            user,
          })
        );
      }
      
      const deposits = data.deposits || [];
      let totalAmount = 0n;
      
      for (const deposit of deposits) {
        if (!product || (typeof deposit.product === 'string' ? deposit.product.toLowerCase() : deposit.product.address.toLowerCase()) === product.toLowerCase()) {
          totalAmount += BigInt(deposit.amount);
        }
      }
      
      return {
        totalAmount: totalAmount.toString(),
      };
    } catch (error) {
      console.error('Error fetching total deposits by user:', error);
      throw error;
    }
  }

  // Product queries
  async getProducts(page: number = 0, limit: number = 10): Promise<Product[]> {
    try {
      const query = `
        query GetProducts($first: Int!, $skip: Int!) {
          products(
            first: $first
            skip: $skip
            orderBy: createdAt
            orderDirection: desc
          ) {
            id
            address
            name
            underlying
            maxCapacity
            totalVolume
            totalVolumeUSD
            totalOrders
            totalUsers
            totalDeposits
            totalWithdrawals
            status
            lastStatusUpdate
            createdAt
            updatedAt
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          first: limit,
          skip: page,
        })
      );
      
      return (data as { products: Product[] }).products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProductById(productId: string): Promise<Product | null> {
    try {
      const query = `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            address
            name
            underlying
            maxCapacity
            currency
            manager
            exWallet
            router
            market
            coupon
            strikePrice1
            strikePrice2
            strikePrice3
            strikePrice4
            tr1
            tr2
            issuanceDate
            maturityDate
            apy
            underlyingSpotRef
            optionMinOrderSize
            subAccountId
            participation
            status
            lastStatusUpdate
            totalVolume
            totalVolumeUSD
            totalOrders
            totalUsers
            totalDeposits
            totalWithdrawals
            createdAt
            updatedAt
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, { id: productId })
      );
      
      return (data as { product: Product | null }).product;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async getProductUsersByProduct(productId: string, page: number = 0, limit: number = 10): Promise<ProductUser[]> {
    try {
      const query = `
        query GetProductUsersByProduct($product: String!, $first: Int!, $skip: Int!) {
          productUsers(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: lastActivity
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
              status
              lastStatusUpdate
            }
            user {
              id
              address
              totalDeposits
              totalWithdrawals
              totalCoupons
              totalOptions
              lifetimeVolume
              lifetimeVolumeUSD
            }
            totalDeposits
            totalWithdrawals
            totalCoupons
            totalOptions
            currentBalance
            firstDeposit
            lastActivity
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { productUsers: ProductUser[] }).productUsers;
    } catch (error) {
      console.error('Error fetching product users:', error);
      throw error;
    }
  }

  async getDeposits(productId: string, page: number = 0, limit: number = 10): Promise<Deposit[]> {
    try {
      const query = `
        query GetDeposits($product: String!, $first: Int!, $skip: Int!) {
          deposits(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            user {
              id
              address
            }
            amount
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { deposits: Deposit[] }).deposits;
    } catch (error) {
      console.error('Error fetching deposits:', error);
      throw error;
    }
  }

  async getWithdrawals(productId: string, page: number = 0, limit: number = 10): Promise<Withdrawal[]> {
    try {
      const query = `
        query GetWithdrawals($product: String!, $first: Int!, $skip: Int!) {
          withdrawPrincipals(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            user {
              id
              address
            }
            amount
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { withdrawPrincipals: Withdrawal[] }).withdrawPrincipals;
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      throw error;
    }
  }

  async getCoupons(productId: string, page: number = 0, limit: number = 10): Promise<Coupon[]> {
    try {
      const query = `
        query GetCoupons($product: String!, $first: Int!, $skip: Int!) {
          withdrawCoupons(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            user {
              id
              address
            }
            amount
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { withdrawCoupons: Coupon[] }).withdrawCoupons;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      throw error;
    }
  }

  async getOptions(productId: string, page: number = 0, limit: number = 10): Promise<Option[]> {
    try {
      const query = `
        query GetOptions($product: String!, $first: Int!, $skip: Int!) {
          withdrawOptions(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            user {
              id
              address
            }
            amount
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { withdrawOptions: Option[] }).withdrawOptions;
    } catch (error) {
      console.error('Error fetching options:', error);
      throw error;
    }
  }

  // Status Events Queries
  async getIssuances(productId: string, page: number = 0, limit: number = 10): Promise<StatusEvent[]> {
    try {
      const query = `
        query GetIssuances($product: String!, $first: Int!, $skip: Int!) {
          issuances(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { issuances: StatusEvent[] }).issuances;
    } catch (error) {
      console.error('Error fetching issuances:', error);
      throw error;
    }
  }

  async getFundAccepts(productId: string, page: number = 0, limit: number = 10): Promise<StatusEvent[]> {
    try {
      const query = `
        query GetFundAccepts($product: String!, $first: Int!, $skip: Int!) {
          fundAccepts(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { fundAccepts: StatusEvent[] }).fundAccepts;
    } catch (error) {
      console.error('Error fetching fund accepts:', error);
      throw error;
    }
  }

  async getFundLocks(productId: string, page: number = 0, limit: number = 10): Promise<StatusEvent[]> {
    try {
      const query = `
        query GetFundLocks($product: String!, $first: Int!, $skip: Int!) {
          fundLocks(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { fundLocks: StatusEvent[] }).fundLocks;
    } catch (error) {
      console.error('Error fetching fund locks:', error);
      throw error;
    }
  }

  async getMatures(productId: string, page: number = 0, limit: number = 10): Promise<StatusEvent[]> {
    try {
      const query = `
        query GetMatures($product: String!, $first: Int!, $skip: Int!) {
          matures(
            first: $first
            skip: $skip
            where: { product: $product }
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            id
            product {
              id
              address
              name
            }
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          product: productId,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { matures: StatusEvent[] }).matures;
    } catch (error) {
      console.error('Error fetching matures:', error);
      throw error;
    }
  }

  // Status Queries
  async getProductsByStatus(status: string, page: number = 0, limit: number = 10): Promise<Product[]> {
    try {
      const query = `
        query GetProductsByStatus($status: Int!, $first: Int!, $skip: Int!) {
          products(
            first: $first
            skip: $skip
            where: { status: $status }
            orderBy: lastStatusUpdate
            orderDirection: desc
          ) {
            id
            address
            name
            underlying
            maxCapacity
            status
            lastStatusUpdate
            totalVolume
            totalVolumeUSD
            totalUsers
            totalDeposits
            totalWithdrawals
            createdAt
            updatedAt
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          status,
          first: limit,
          skip: page,
        })
      );
      
      return (data as { products: Product[] }).products;
    } catch (error) {
      console.error('Error fetching products by status:', error);
      throw error;
    }
  }

  async getUsers(page: number = 0, limit: number = 10): Promise<User[]> {
    try {
      const query = `
        query GetUsers($first: Int!, $skip: Int!) {
          users(
            first: $first
            skip: $skip
            orderBy: lastSeen
            orderDirection: desc
          ) {
            id
            address
            totalDeposits
            totalWithdrawals
            totalCoupons
            totalOptions
            lifetimeVolume
            lifetimeVolumeUSD
            firstSeen
            lastSeen
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, {
          first: limit,
          skip: page,
        })
      );
      
      return (data as { users: User[] }).users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            address
            totalDeposits
            totalWithdrawals
            totalCoupons
            totalOptions
            lifetimeVolume
            lifetimeVolumeUSD
            firstSeen
            lastSeen
          }
        }
      `;
      
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(query, { id: userId })
      );
      
      return (data as { user: User | null }).user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Get deposits by user and product
  async getDepositsByUser(userAddress: string, productAddress: string, page: number = 0, limit: number = 10): Promise<Deposit[]> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(`
          query GetDepositsByUser($user: String!, $product: String!, $first: Int!, $skip: Int!) {
            deposits(
              first: $first
              skip: $skip
              orderBy: blockTimestamp
              orderDirection: desc
              where: { user: $user, product: $product }
            ) {
              id
              amount
              blockTimestamp
              transactionHash
              product {
                address
                name
              }
              user {
                address
              }
            }
          }
        `, {
          user: userAddress.toLowerCase(),
          product: productAddress.toLowerCase(),
          first: limit,
          skip: page,
        })
      );
      
      return (data as { deposits: Deposit[] }).deposits || [];
    } catch (error) {
      console.error('Error fetching deposits by user:', error);
      return [];
    }
  }

  // Get withdraw principals by user and product
  async getWithdrawPrincipalsByUser(userAddress: string, productAddress: string, page: number = 0, limit: number = 10): Promise<Withdrawal[]> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(`
          query GetWithdrawPrincipalsByUser($user: String!, $product: String!, $first: Int!, $skip: Int!) {
            withdrawPrincipals(
              first: $first
              skip: $skip
              orderBy: blockTimestamp
              orderDirection: desc
              where: { user: $user, product: $product }
            ) {
              id
              amount
              blockTimestamp
              transactionHash
              product {
                address
                name
              }
              user {
                address
              }
            }
          }
        `, {
          user: userAddress.toLowerCase(),
          product: productAddress.toLowerCase(),
          first: limit,
          skip: page,
        })
      );
      
      return (data as { withdrawPrincipals: Withdrawal[] }).withdrawPrincipals || [];
    } catch (error) {
      console.error('Error fetching withdraw principals by user:', error);
      return [];
    }
  }

  // Get withdraw coupons by user and product
  async getWithdrawCouponsByUser(userAddress: string, productAddress: string, page: number = 0, limit: number = 10): Promise<Coupon[]> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(`
          query GetWithdrawCouponsByUser($user: String!, $product: String!, $first: Int!, $skip: Int!) {
            withdrawCoupons(
              first: $first
              skip: $skip
              orderBy: blockTimestamp
              orderDirection: desc
              where: { user: $user, product: $product }
            ) {
              id
              amount
              blockTimestamp
              transactionHash
              product {
                address
                name
              }
              user {
                address
              }
            }
          }
        `, {
          user: userAddress.toLowerCase(),
          product: productAddress.toLowerCase(),
          first: limit,
          skip: page,
        })
      );
      
      return (data as { withdrawCoupons: Coupon[] }).withdrawCoupons || [];
    } catch (error) {
      console.error('Error fetching withdraw coupons by user:', error);
      return [];
    }
  }

  // Get withdraw options by user and product
  async getWithdrawOptionsByUser(userAddress: string, productAddress: string, page: number = 0, limit: number = 10): Promise<Option[]> {
    try {
      const client = await this.getClient();
      const data = await retryRequest(() =>
        client.request(`
          query GetWithdrawOptionsByUser($user: String!, $product: String!, $first: Int!, $skip: Int!) {
            withdrawOptions(
              first: $first
              skip: $skip
              orderBy: blockTimestamp
              orderDirection: desc
              where: { user: $user, product: $product }
            ) {
              id
              amount
              blockTimestamp
              transactionHash
              product {
                address
                name
              }
              user {
                address
              }
            }
          }
        `, {
          user: userAddress.toLowerCase(),
          product: productAddress.toLowerCase(),
          first: limit,
          skip: page,
        })
      );
      
      return (data as { withdrawOptions: Option[] }).withdrawOptions || [];
    } catch (error) {
      console.error('Error fetching withdraw options by user:', error);
      return [];
    }
  }
}

// Example usage
async function main(): Promise<void> {
  const api = new SubgraphAPI();
  
  try {
    // Example 1: Get all products
    console.log('=== Getting Products ===');
    const products = await api.getProducts(0, 5);
    console.log('Products:', JSON.stringify(products, null, 2));
    
    if (products.length > 0) {
      const firstProduct = products[0];
      
      // Example 2: Get product details with status
      console.log('\n=== Getting Product Details ===');
      const productDetails = await api.getProductById(firstProduct.id);
      console.log('Product Details:', JSON.stringify(productDetails, null, 2));
      
      // Example 3: Get products by status
      console.log('\n=== Getting Products by Status ===');
      const pendingProducts = await api.getProductsByStatus("Pending", 0, 5);
      console.log('Pending Products:', JSON.stringify(pendingProducts, null, 2));
      
      const acceptedProducts = await api.getProductsByStatus("Accepted", 0, 5);
      console.log('Accepted Products:', JSON.stringify(acceptedProducts, null, 2));
      
      // Example 4: Get product users
      console.log('\n=== Getting Product Users ===');
      const productUsers = await api.getProductUsersByProduct(firstProduct.id, 0, 5);
      console.log('Product Users:', JSON.stringify(productUsers, null, 2));
      
      // Example 5: Get deposits for product
      console.log('\n=== Getting Deposits ===');
      const deposits = await api.getDeposits(firstProduct.id, 0, 5);
      console.log('Deposits:', JSON.stringify(deposits, null, 2));
      
      // Example 6: Get withdrawals for product
      console.log('\n=== Getting Withdrawals ===');
      const withdrawals = await api.getWithdrawals(firstProduct.id, 0, 5);
      console.log('Withdrawals:', JSON.stringify(withdrawals, null, 2));
      
      // Example 7: Get status events
      console.log('\n=== Getting Status Events ===');
      const issuances = await api.getIssuances(firstProduct.id, 0, 5);
      console.log('Issuances:', JSON.stringify(issuances, null, 2));
      
      const fundAccepts = await api.getFundAccepts(firstProduct.id, 0, 5);
      console.log('Fund Accepts:', JSON.stringify(fundAccepts, null, 2));
      
      const fundLocks = await api.getFundLocks(firstProduct.id, 0, 5);
      console.log('Fund Locks:', JSON.stringify(fundLocks, null, 2));
      
      const matures = await api.getMatures(firstProduct.id, 0, 5);
      console.log('Matures:', JSON.stringify(matures, null, 2));
    }
    
  } catch (error) {
    console.error('Error in main:', error);
  }
}

// Export for use in other files
export default SubgraphAPI;
import SubgraphAPI from './subgraph-api.js';

// Type definitions
interface StatusEvent {
  type: string;
  status: number;
  txHash: string;
  timestamp: string;
}

interface UserTransaction {
  eventName: string;
  productAddress: string;
  productName: string;
  amount: string;
  txHash: string;
  timestamp: string;
}

interface Product {
  id: string;
  name: string;
  address: string;
  status: string;
  lastStatusUpdate: string;
  totalUsers: string;
  totalDeposits: string;
  underlying?: string;
  maxCapacity?: string;
  totalVolume?: string;
}

interface ProductUser {
  id: string;
  user: {
    address: string;
  };
  totalDeposits: string;
  currentBalance: string;
}

interface Deposit {
  id: string;
  user: string | { address: string };
  amount: string;
  blockTimestamp: string;
}

interface Withdrawal {
  id: string;
  user: string | { address: string };
  amount: string;
  blockTimestamp: string;
}

interface Coupon {
  id: string;
  user: string | { address: string };
  amount: string;
  blockTimestamp: string;
}

interface Option {
  id: string;
  user: string | { address: string };
  amount: string;
  blockTimestamp: string;
}

interface User {
  id: string;
  address: string;
  totalDeposits: string;
  lifetimeVolume: string;
}

// Helper function to get status name
function getStatusName(status: number): string {
  switch (status) {
    case 0: return 'Pending';
    case 1: return 'Accepted';
    case 2: return 'Locked';
    case 3: return 'Issued';
    case 4: return 'Mature';
    default: return 'Unknown';
  }
}

// Helper function to get latest status event for a product
async function getLatestStatusEvent(api: SubgraphAPI, productAddress: string): Promise<StatusEvent | null> {
  try {
    // Get all status events for this product
    const [issuances, fundAccepts, fundLocks, matures] = await Promise.all([
      api.getIssuances(productAddress, 0, 1),
      api.getFundAccepts(productAddress, 0, 1),
      api.getFundLocks(productAddress, 0, 1),
      api.getMatures(productAddress, 0, 1)
    ]);
    
    const events: StatusEvent[] = [];
    if (issuances.length > 0) events.push({ type: 'Issuance', status: 3, txHash: issuances[0].transactionHash, timestamp: issuances[0].blockTimestamp });
    if (fundAccepts.length > 0) events.push({ type: 'FundAccept', status: 1, txHash: fundAccepts[0].transactionHash, timestamp: fundAccepts[0].blockTimestamp });
    if (fundLocks.length > 0) events.push({ type: 'FundLock', status: 2, txHash: fundLocks[0].transactionHash, timestamp: fundLocks[0].blockTimestamp });
    if (matures.length > 0) events.push({ type: 'Mature', status: 4, txHash: matures[0].transactionHash, timestamp: matures[0].blockTimestamp });
    
    // Return the most recent event
    if (events.length > 0) {
      events.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
      return events[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting latest status event:', error);
    return null;
  }
}

// Helper function to get all deposit and withdraw transactions for a user
async function getUserTransactionHistory(api: SubgraphAPI, userAddress: string): Promise<UserTransaction[]> {
  try {
    // Get all products first
    const allProducts = await api.getProducts(0, 50); // Get more products to cover all
    const allTransactions: UserTransaction[] = [];
    
    // For each product, get deposits and withdraws for this user
    for (const product of allProducts) {
      // Get deposits for this user in this product
      const deposits = await api.getDepositsByUser(userAddress, product.address, 0, 100);
      deposits.forEach(deposit => {
        allTransactions.push({
          eventName: 'deposit',
          productAddress: product.address,
          productName: product.name,
          amount: deposit.amount,
          txHash: deposit.transactionHash,
          timestamp: deposit.blockTimestamp
        });
      });
      
      // Get withdraw principals for this user in this product
      const withdrawPrincipals = await api.getWithdrawPrincipalsByUser(userAddress, product.address, 0, 100);
      withdrawPrincipals.forEach(withdraw => {
        allTransactions.push({
          eventName: 'withdraw_principal',
          productAddress: product.address,
          productName: product.name,
          amount: withdraw.amount,
          txHash: withdraw.transactionHash,
          timestamp: withdraw.blockTimestamp
        });
      });
      
      // Get withdraw coupons for this user in this product
      const withdrawCoupons = await api.getWithdrawCouponsByUser(userAddress, product.address, 0, 100);
      withdrawCoupons.forEach(withdraw => {
        allTransactions.push({
          eventName: 'withdraw_coupon',
          productAddress: product.address,
          productName: product.name,
          amount: withdraw.amount,
          txHash: withdraw.transactionHash,
          timestamp: withdraw.blockTimestamp
        });
      });
      
      // Get withdraw options for this user in this product
      const withdrawOptions = await api.getWithdrawOptionsByUser(userAddress, product.address, 0, 100);
      withdrawOptions.forEach(withdraw => {
        allTransactions.push({
          eventName: 'withdraw_option',
          productAddress: product.address,
          productName: product.name,
          amount: withdraw.amount,
          txHash: withdraw.transactionHash,
          timestamp: withdraw.blockTimestamp
        });
      });
    }
    
    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
    
    return allTransactions;
  } catch (error) {
    console.error('Error getting user transaction history:', error);
    return [];
  }
}

async function testAPI(): Promise<void> {
  const api = new SubgraphAPI();
  
  console.log('🚀 Testing SuperHedge Product Subgraph API...\n');
  
  try {
    // Test 1: Get all products
    console.log('📋 Test 1: Getting Products');
    console.log('='.repeat(50));
    const products = await api.getProducts(0, 3);
    console.log(`Found ${products.length} products`);
    if (products.length > 0) {
      console.log('First product:', {
        id: products[0].id,
        name: products[0].name,
        address: products[0].address,
        status: products[0].status,
        lastStatusUpdate: products[0].lastStatusUpdate,
        totalUsers: products[0].totalUsers,
        totalDeposits: products[0].totalDeposits
      });
    }
    console.log('\n');
    
    if (products.length > 0) {
      const firstProduct = products[0];
      
      // Test 2: Get product details with status
      console.log('🔍 Test 2: Getting Product Details with Status');
      console.log('='.repeat(50));
      const productDetails = await api.getProductById(firstProduct.id);
      if (productDetails) {
        console.log('Product Details:', {
          id: productDetails.id,
          name: productDetails.name,
          underlying: productDetails.underlying,
          maxCapacity: productDetails.maxCapacity,
          status: productDetails.status,
          lastStatusUpdate: productDetails.lastStatusUpdate,
          totalVolume: productDetails.totalVolume,
          totalUsers: productDetails.totalUsers
        });
      }
      console.log('\n');
      
      // Test 3: Get products by status
      console.log('📊 Test 3: Getting Products by Status');
      console.log('='.repeat(50));
      
      const pendingProducts = await api.getProductsByStatus("0", 0, 3); // 0 = Pending
      console.log(`Found ${pendingProducts.length} pending products`);
      if (pendingProducts.length > 0) {
        console.log('First pending product:', {
          id: pendingProducts[0].id,
          name: pendingProducts[0].name,
          status: pendingProducts[0].status,
          lastStatusUpdate: pendingProducts[0].lastStatusUpdate
        });
      }
      
      const acceptedProducts = await api.getProductsByStatus("1", 0, 3); // 1 = Accepted
      console.log(`Found ${acceptedProducts.length} accepted products`);
      if (acceptedProducts.length > 0) {
        console.log('First accepted product:', {
          id: acceptedProducts[0].id,
          name: acceptedProducts[0].name,
          status: acceptedProducts[0].status,
          lastStatusUpdate: acceptedProducts[0].lastStatusUpdate
        });
      }
      
      const lockedProducts = await api.getProductsByStatus("2", 0, 3); // 2 = Locked
      console.log(`Found ${lockedProducts.length} locked products`);
      
      const issuedProducts = await api.getProductsByStatus("3", 0, 3); // 3 = Issued
      console.log(`Found ${issuedProducts.length} issued products`);
      
      const matureProducts = await api.getProductsByStatus("4", 0, 3); // 4 = Mature
      console.log(`Found ${matureProducts.length} mature products`);
      console.log('\n');
      
      // Test 4: Get product users
      console.log('👥 Test 4: Getting Product Users');
      console.log('='.repeat(50));
      const productUsers = await api.getProductUsersByProduct(firstProduct.id, 0, 3);
      console.log(`Found ${productUsers.length} users for product`);
      if (productUsers.length > 0) {
        console.log('First user:', {
          id: productUsers[0].id,
          userAddress: productUsers[0].user.address,
          totalDeposits: productUsers[0].totalDeposits,
          currentBalance: productUsers[0].currentBalance
        });
      }
      console.log('\n');
      
      // Test 5: Get deposits
      console.log('💰 Test 5: Getting Deposits');
      console.log('='.repeat(50));
      const deposits = await api.getDeposits(firstProduct.id, 0, 3);
      console.log(`Found ${deposits.length} deposits for product`);
      if (deposits.length > 0) {
        console.log('First deposit:', {
          id: deposits[0].id,
          user: typeof deposits[0].user === 'string' ? deposits[0].user : deposits[0].user.address,
          amount: deposits[0].amount,
          timestamp: new Date(parseInt(deposits[0].blockTimestamp) * 1000).toISOString()
        });
      }
      console.log('\n');
      
      // Test 6: Get withdrawals
      console.log('💸 Test 6: Getting Withdrawals');
      console.log('='.repeat(50));
      const withdrawals = await api.getWithdrawals(firstProduct.id, 0, 3);
      console.log(`Found ${withdrawals.length} withdrawals for product`);
      if (withdrawals.length > 0) {
        console.log('First withdrawal:', {
          id: withdrawals[0].id,
          user: typeof withdrawals[0].user === 'string' ? withdrawals[0].user : withdrawals[0].user.address,
          amount: withdrawals[0].amount,
          timestamp: new Date(parseInt(withdrawals[0].blockTimestamp) * 1000).toISOString()
        });
      }
      console.log('\n');
      
      // Test 7: Get coupons
      console.log('🎫 Test 7: Getting Coupons');
      console.log('='.repeat(50));
      const coupons = await api.getCoupons(firstProduct.id, 0, 3);
      console.log(`Found ${coupons.length} coupons for product`);
      if (coupons.length > 0) {
        console.log('First coupon:', {
          id: coupons[0].id,
          user: typeof coupons[0].user === 'string' ? coupons[0].user : coupons[0].user.address,
          amount: coupons[0].amount,
          timestamp: new Date(parseInt(coupons[0].blockTimestamp) * 1000).toISOString()
        });
      }
      console.log('\n');
      
      // Test 8: Get options
      console.log('📈 Test 8: Getting Options');
      console.log('='.repeat(50));
      const options = await api.getOptions(firstProduct.id, 0, 3);
      console.log(`Found ${options.length} options for product`);
      if (options.length > 0) {
        console.log('First option:', {
          id: options[0].id,
          user: typeof options[0].user === 'string' ? options[0].user : options[0].user.address,
          amount: options[0].amount,
          timestamp: new Date(parseInt(options[0].blockTimestamp) * 1000).toISOString()
        });
      }
      console.log('\n');
      
      // Test 9: Get status events
      console.log('🔄 Test 9: Product Status by Address');
      console.log('='.repeat(50));
      
      // Get all products
      const allProducts = await api.getProducts(0, 10);
      console.log(`Found ${allProducts.length} products`);
      
             // Filter and show status for each product
       for (const product of allProducts) {
         console.log(`\n📦 Product: ${product.address}`);
         console.log(`   Name: ${product.name}`);
         
         // Get latest status event for this product
         const latestStatusEvent = await getLatestStatusEvent(api, product.address);
         if (latestStatusEvent) {
           console.log(`   Status: ${latestStatusEvent.status} (${getStatusName(latestStatusEvent.status)})`);
           console.log(`   Latest Status Event: ${latestStatusEvent.type}`);
           console.log(`   Transaction: ${latestStatusEvent.txHash}`);
           console.log(`   Timestamp: ${new Date(parseInt(latestStatusEvent.timestamp) * 1000).toISOString()}`);
         } else {
           console.log(`   Status: ${product.status} (${getStatusName(parseInt(product.status))}) - No events found`);
           console.log(`   Last Status Update: ${new Date(parseInt(product.lastStatusUpdate) * 1000).toISOString()}`);
         }
         console.log('-'.repeat(40));
       }
      
      console.log('\n');
      
      // Test 10: Get product user count
      console.log('📊 Test 10: Getting Product User Count');
      console.log('='.repeat(50));
      const userCount = await api.getProductUserCount(firstProduct.address);
      console.log(`Product has ${userCount} users`);
      console.log('\n');
      
      // Test 11: Get latest deposits for a user (if we have users)
      if (productUsers.length > 0) {
        console.log('⏰ Test 11: Getting Latest Deposits for User');
        console.log('='.repeat(50));
        const userAddress = productUsers[0].user.address;
        const latestDeposit = await api.getLatestDeposits(userAddress, firstProduct.address);
        if (latestDeposit) {
          console.log('Latest deposit:', {
            id: latestDeposit.id,
            amount: latestDeposit.amount,
            timestamp: new Date(parseInt(latestDeposit.blockTimestamp) * 1000).toISOString()
          });
        } else {
          console.log('No latest deposits found for this user');
        }
        console.log('\n');
      }
    }
    
    // Test 12: Get all users
    console.log('👤 Test 12: Getting All Users');
    console.log('='.repeat(50));
    const users = await api.getUsers(0, 3);
    console.log(`Found ${users.length} users`);
    if (users.length > 0) {
      console.log('First user:', {
        id: users[0].id,
        address: users[0].address,
        totalDeposits: users[0].totalDeposits,
        lifetimeVolume: users[0].lifetimeVolume
      });
    }
    console.log('\n');
    
    // Test 13: Get all deposit and withdraw transactions for a specific user
    console.log('💰 Test 13: User Transaction History');
    console.log('='.repeat(50));
    const userAddress = '0xa15cd8Ead9eE58C1c02AC4C224523e9a38D95a1d';
    console.log(`Filtering transactions for user: ${userAddress}`);
    
    const userTransactions = await getUserTransactionHistory(api, userAddress);
    if (userTransactions.length > 0) {
      console.log(`Found ${userTransactions.length} transactions:`);
      userTransactions.forEach((tx, index) => {
        console.log(`\n${index + 1}. ${tx.eventName.toUpperCase()}`);
        console.log(`   Product: ${tx.productAddress}`);
        console.log(`   Amount: ${tx.amount}`);
        console.log(`   Transaction: ${tx.txHash}`);
        console.log(`   Timestamp: ${new Date(parseInt(tx.timestamp) * 1000).toISOString()}`);
      });
    } else {
      console.log('No transactions found for this user');
    }
    console.log('\n');
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAPI(); 
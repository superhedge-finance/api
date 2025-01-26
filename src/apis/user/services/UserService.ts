import { Inject, Injectable } from "@tsed/di";
import { In ,Not , IsNull} from "typeorm";
import { Product, ProductRepository, User, UserRepository, HistoryRepository } from "../../../dal";
import { CreateUserDto } from "../dto/CreateUserDto";
import { HistoryResponseDto } from "../dto/HistoryResponseDto";
import { SummaryDto } from "../dto/SummaryDto";
import {ProductService} from "../../product/services/ProductService"
import { TransactionHistoryDto } from "../dto/TransactionHistoryDto";
import { GroupTransactionDto } from "../dto/GroupTransactionDto";
@Injectable()
export class UserService {

  @Inject()
  private readonly productService: ProductService;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  async create(request: CreateUserDto): Promise<User> {
    const entity = new User();
    entity.address = request.address;
    entity.userName = request.username;
    entity.email = request.email;
    entity.subscribed = request.subscribed;
    return this.userRepository.save(entity);
  }

  async get(address: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { address } });
  }

  async checkBalance(chainId: number, walletAddress: string, productIds: number[]): Promise<void> {
    try {
      console.log("checkBalance")
      const { idList, productAddress, tokenAddress } = await this.getProductAndTokenList(chainId);
      const jsonData = idList.map((userId, index) => ({
        id: userId,
        productAddress: productAddress[index],
        tokenAddress: tokenAddress[index]
      }));

      const userList = jsonData.filter(entry => productIds.includes(entry.id));
      const withoutUserList = jsonData.filter(entry => !productIds.includes(entry.id));
      // Check and Delete Product
      for (const item of userList){
        const { tokenBalance } = await this.productService.checkTokenBalance(chainId, item.tokenAddress, walletAddress);
        if (tokenBalance == 0) {
          await this.productService.removeProductUser(chainId, item.productAddress, walletAddress, "null");
        }
      }
    
        // Check and Save Product
        for (const item of withoutUserList) {
          const { tokenBalance } = await this.productService.checkTokenBalance(chainId, item.tokenAddress, walletAddress);
          if (tokenBalance > 0) {
            await this.productService.saveProductUser(chainId, item.productAddress, walletAddress, "null");
          }
        }
    } catch (error) {
        console.error("Error in checkBalance:", error);
    }
}

  async getProductId(walletAddress: string): Promise<{ productId: number[] }> {
    try {
        const product = await this.userRepository.findOne({
            where: {
                address: walletAddress,
            },
        });
        
        const productId = product?.productIds || []; 
        return { productId };
    } catch (e) {
        console.error(`getProductId error: ${e}`); 
        return { productId: [] }; 
    }
}

  async getProductList(walletAddress: string): Promise<Array<{ name: string; address: string }>> {
    try {
      const product = await this.userRepository.findOne({
          where: {
              address: walletAddress,
          },
      });
      
      const productId = product?.productIds || []; 
      console.log(productId);

      // Fetch product names and addresses using product IDs
      const products = await this.productRepository.find({
        select: ["name", "address"],
        where: {
          id: In(productId),
        },
      });

      // Map products to an array of objects with name and address
      const productList = products.map(product => ({
        name: product.name,
        address: product.address
      }));

      console.log(productList);
      return productList;

    } catch (e) {
      console.error(`getProductList error: ${e}`); 
      return []; // Return an empty array in case of an error
    }
  }

  async getProductAndTokenList(chainId: number): Promise<{idList: number[] ,productAddress: string[]; tokenAddress: string[] }> {
    try {
      const products = await this.productRepository.find({
        select: ["id","address", "addressesList"],
        where: {
          status: Not(0),
          isPaused: false,
          chainId: chainId,
          address: Not(IsNull()),
          addressesList: Not(IsNull()),
        },
        order: {
          created_at: "ASC",
        },
      });
      
      const idList = products.map((product) => product.id);
      const productAddress = products.map((product) => product.address);
      const tokenAddress = products.map((product) => product.addressesList.tokenAddress);
  
      return { idList,productAddress, tokenAddress };
    } catch (e) {
      console.log(`getProductAndTokenList ${e}`);
      return { idList: [], productAddress: [], tokenAddress: [] };
    }
  }

  async getPositions(chainId: number, address: string): Promise<Array<Product>> {
    console.log("getPositions");

    // Fetch product IDs associated with the address
    const { productId } = await this.getProductId(address);
    console.log("Product IDs:", productId);

    // Check balance for the given address and product IDs
    await this.checkBalance(chainId, address, productId);

    // Fetch the user based on the address
    const user = await this.userRepository.findOne({ where: { address } });
    console.log(user)
    if (!user) {
        // If the user does not exist, create a new user entry
        await this.create({ address, username: "", email: "", subscribed: false });
        return [];
    }

    // Fetch products while excluding sensitive fields
    const products = await this.productRepository.find({
        select: ["id", "name", "address", "underlying", "issuanceCycle", "status", "chainId", "currencyName", "underlyingName"], // Exclude publicKey and privateKey
        where: {
            id: In(user.productIds),
            chainId: chainId,
            isPaused: false,
        },
    });

    return products;
}

  async getHistories(chainId: number, address: string, sort: number): Promise<Array<HistoryResponseDto>> {
    console.log("getHistories")
    const histories = await this.historyRepository
      .createQueryBuilder("history")
      .leftJoinAndMapOne("history.product", Product, "product", "product.id = history.product_id")
      .select([
          "history.address",
          "history.type",
          "history.withdrawType",
          "history.amountInDecimal",
          "history.transactionHash",
          "history.created_at",
          "product.id",
          "product.name", // Only select the fields you need
          // Exclude publicKey and privateKey
      ])
      .where("history.address = :address", { address })
      .andWhere("history.chain_id = :chainId", { chainId })
      .andWhere("history.product_id > 0")
      .orderBy("history.created_at", sort === 1 ? "ASC" : "DESC")
      .getMany();

    // console.log(histories)
    return histories.map((history) => {
      return {
        address: history.address,
        type: history.type,
        withdrawType: history.withdrawType,
        productName: history.product.name,
        amountInDecimal: history.amountInDecimal,
        transactionHash: history.transactionHash,
        createdAt: history.created_at,
      };
    });
  }

//   async getHistories(chainId: number, address: string, sort: number): Promise<Array<HistoryResponseDto>> {
//     console.log("getHistories");
//     const histories = await this.historyRepository
//         .createQueryBuilder("history")
//         .leftJoinAndMapOne("history.product", Product, "product", "product.id = history.product_id")
//         .where("history.address = :address", { address })
//         .andWhere("history.chain_id = :chainId", { chainId })
//         .andWhere("history.product_id > 0")
//         .orderBy("history.created_at", sort === 1 ? "ASC" : "DESC")
//         .getMany();
    
//     // Check if histories is not null or undefined
//     if (!histories) {
//         console.error("No histories found for the given address and chain ID.");
//         return []; // Return an empty array if no histories are found
//     }
//     return histories.map((history) => {
//         // Check if history.product is not null before accessing its properties
//         const productName = history.product ? history.product.name : "Unknown Product"; // Fallback if product is null
//         return {
//             address: history.address,
//             type: history.type,
//             withdrawType: history.withdrawType,
//             productName: productName,
//             amountInDecimal: history.amountInDecimal,
//             transactionHash: history.transactionHash,
//             createdAt: history.created_at,
//         };
//     });
// }

  // async getUserTransactionHistory(chainId: number, address: string, sort: number): Promise<GroupTransactionDto[]> {
  //   console.log("getHistories");
  //   const histories = await this.historyRepository
  //       .createQueryBuilder("history")
  //       .where("history.address = :address", { address })
  //       .andWhere("history.chain_id = :chainId", { chainId })
  //       .andWhere("history.product_id > 0")
  //       .orderBy("history.created_at", sort === 1 ? "ASC" : "DESC")
  //       .getMany();

  //   const adminHistories = await this.historyRepository
  //       .createQueryBuilder("history")
  //       .andWhere("history.chain_id = :chainId", { chainId })
  //       .andWhere("history.address = :address", { address: "Admin" })
  //       .orderBy("history.created_at", sort === 1 ? "ASC" : "DESC")
  //       .getMany();
    
  //   const allHistories = [...histories, ...adminHistories];
  //   allHistories.sort((a, b) => 
  //       sort === 1 
  //           ? a.created_at.getTime() - b.created_at.getTime() 
  //           : b.created_at.getTime() - a.created_at.getTime()
  //   );
  //   // Group transactions by createdAt date
  //   const groupedTransactions = allHistories.reduce((groups: { [key: string]: TransactionHistoryDto[] }, history) => {
  //       const date = history.created_at.toISOString().split('T')[0];
  //       if (!groups[date]) {
  //           groups[date] = [];
  //       }

  //       groups[date].push({
  //           address: history.address,
  //           type: history.type,
  //           withdrawType: history.withdrawType,
  //           txHash: history.transactionHash,
  //           amountInDecimal: history.amountInDecimal,
  //           transactionHash: history.transactionHash,
  //           createdAt: history.created_at,
  //       });
  //       return groups;
  //   }, {});

  //   // console.log('groupedTransactions');
  //   // console.log(groupedTransactions);

  //   // Convert the grouped transactions object to an array of GroupTransactionDto
  //   const result: GroupTransactionDto[] = Object.entries(groupedTransactions).map(([date, transactions]) => ({
  //     transactionTime: date,
  //     transactionHistory: transactions,
  //   }));

  //   // console.log(result)
  //   return result;
  // }

  async getUserTransactionHistory(chainId: number, address: string, sort: number): Promise<GroupTransactionDto[]> {
    console.log("getHistories");
    console.log(address)
    const histories = await this.historyRepository
        .createQueryBuilder("history")
        .where("history.address = :address", { address })
        .andWhere("history.chain_id = :chainId", { chainId })
        .andWhere("history.product_id > 0")
        .orderBy("history.event_time", sort === 1 ? "ASC" : "DESC")
        .getMany();

    const adminHistories = await this.historyRepository
        .createQueryBuilder("history")
        .andWhere("history.chain_id = :chainId", { chainId })
        .andWhere("history.address = :address", { address: "Admin" })
        .orderBy("history.event_time", sort === 1 ? "ASC" : "DESC")
        .getMany();
    

    console.log(histories)    

    const allHistories = [...histories, ...adminHistories].filter(history => history.eventTime !== null);
    allHistories.sort((a, b) => {
        // Safely handle potential null values
        const timeA = a.eventTime?.getTime() || 0;
        const timeB = b.eventTime?.getTime() || 0;
        return sort === 1 ? timeA - timeB : timeB - timeA;
    });
    // Group transactions by createdAt date
    const groupedTransactions = allHistories.reduce((groups: { [key: string]: TransactionHistoryDto[] }, history) => {
        // Safely handle null eventTime
        const date = history.eventTime?.toISOString().split('T')[0] || 'Unknown Date';
        if (!groups[date]) {
            groups[date] = [];
        }

        groups[date].push({
            address: history.address,
            type: history.type,
            withdrawType: history.withdrawType,
            eventName: history.eventName,
            txHash: history.transactionHash,
            amountInDecimal: history.amountInDecimal,
            amountDecimal: history.amountDecimal,
            tokenSymbol: history.tokenSymbol,
            decimals: history.decimals,
            transactionHash: history.transactionHash,
            createdAt: history.created_at,
            eventTime: history.eventTime,
        });
        return groups;
    }, {});

    // console.log('groupedTransactions');
    // console.log(groupedTransactions);

    // Convert the grouped transactions object to an array of GroupTransactionDto
    const result: GroupTransactionDto[] = Object.entries(groupedTransactions).map(([date, transactions]) => ({
      transactionTime: date,
      transactionHistory: transactions,
    }));

    // console.log(result)
    return result;
  }

  async getSummaries(
    chainId: number, 
    address: string, 
    startTime: string, 
    endTime: string
  ): Promise<Array<SummaryDto>> {
    const summaries = await this.historyRepository
      .query(`select dates::date, total_balance from generate_series('${startTime}'::date, '${endTime}'::date, '1 day') as dates
      left join (
          select distinct on ("updated_at") * from (
           select updated_at::date as updated_at, id, total_balance from histories where address = '${address}' and chain_id = '${chainId}'
          ) as A order by "updated_at", "id" DESC
      ) as B ON dates = B.updated_at`);
      
    return summaries.map((summary: any) => {
      return {
        dates: summary.dates,
        totalBalance: summary.total_balance
      }
    });
  }
}

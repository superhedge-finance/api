import { Inject, Injectable } from "@tsed/di";
import { In } from "typeorm";
import { Product, ProductRepository, User, UserRepository, HistoryRepository } from "../../../dal";
import { CreateUserDto } from "../dto/CreateUserDto";
import { HistoryResponseDto } from "../dto/HistoryResponseDto";
import { SummaryDto } from "../dto/SummaryDto";

@Injectable()
export class UserService {
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

  async getPositions(chainId: number, address: string): Promise<Array<Product>> {
    console.log("paul")
    const user = await this.userRepository.findOne({ where: { address } });
    if (!user) {
      await this.create({ address, username: "", email: "", subscribed: false });
      return [];
    }
    return this.productRepository.find({
      where: {
        id: In(user.productIds),
        chainId: chainId,
        isPaused: false
      },
    });
  }

  async getHistories(chainId: number, address: string, sort: number): Promise<Array<HistoryResponseDto>> {
    const histories = await this.historyRepository
      .createQueryBuilder("history")
      .leftJoinAndMapOne("history.product", Product, "product", "product.id = history.product_id")
      .where("history.address = :address", { address })
      .andWhere("history.chain_id = :chainId", { chainId })
      .andWhere("history.product_id > 0")
      .orderBy("history.created_at", sort === 1 ? "ASC" : "DESC")
      .getMany();
    
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

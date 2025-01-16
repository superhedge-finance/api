import { Controller, Inject } from "@tsed/di";
import { Get, Post, Returns } from "@tsed/schema";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { UserService } from "./services/UserService";
import { CreateUserDto } from "./dto/CreateUserDto";
import { CreatedUserDto } from "./dto/CreatedUserDto";
import { Product, User } from "../../dal";
import { HistoryResponseDto } from "./dto/HistoryResponseDto";
import { SummaryDto } from "./dto/SummaryDto";
import { TransactionHistoryDto } from "./dto/TransactionHistoryDto";
import { GroupTransactionDto } from "./dto/GroupTransactionDto";

@Controller("/users")
export class UserController {
  @Inject()
  private readonly userService: UserService;

  @Post("")
  @Returns(200, CreatedUserDto).Description("Inserted Id")
  async create(@BodyParams() body: CreateUserDto): Promise<CreatedUserDto> {
    const user = await this.userService.create(body);
    return { id: user.id };
  }

  @Get("/:address")
  async get(@PathParams("address") address: string): Promise<User | null> {
    return await this.userService.get(address);
  }

  @Get("/portfolio/:address")
  @Returns(200, Array).Of(SummaryDto)
  async getSummaries(
    @PathParams("address") address: string, 
    @QueryParams("startTime") startTime: string,
    @QueryParams("endTime") endTime: string,
    @QueryParams("chainId") chainId: number
  ): Promise<Array<SummaryDto>> {
    return this.userService.getSummaries(chainId, address, startTime, endTime);
  }

  @Get("/positions/:address")
  @Returns(200, Array).Of(Product)
  async getPositions(@PathParams("address") address: string, @QueryParams("chainId") chainId: number): Promise<Array<Product>> {
    return this.userService.getPositions(chainId, address);
  }

  @Get("/history/:address")
  @Returns(200, Array).Of(HistoryResponseDto)
  async getHistories(
    @PathParams("address") address: string,
    @QueryParams("sort") sort: number,
    @QueryParams("chainId") chainId: number,
  ): Promise<Array<HistoryResponseDto>> {
    // console.log(this.userService.getHistories(chainId, address, sort))
    return this.userService.getHistories(chainId, address, sort);
  }

  @Post("/productlist/address")
  async getProductList(
    @QueryParams("address") address: string
  ): Promise<Array<{ name: string; address: string }>> {
    return await this.userService.getProductList(address);
  }

  @Get("/transaction-history/:address")
  @Returns(200, Array)
  async getTransactionHistory(
    @PathParams("address") address: string,
    @QueryParams("chainId") chainId: number,
  ): Promise<GroupTransactionDto[] > {
    const result = await this.userService.getUserTransactionHistory(chainId, address,0);
    return result;
  }


}

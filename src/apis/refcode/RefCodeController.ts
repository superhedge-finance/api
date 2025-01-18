import { Controller, Inject } from "@tsed/di";
import { Res } from "@tsed/common";
import { Get, Post, Returns,Summary } from "@tsed/schema";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { ContractService } from "../../services/ContractService";
import { RefCodeService } from "./RefCodeService";

import { Not, UpdateResult } from "typeorm";
// import { CronService } from "../../services/CronService";

@Controller("/refcodes")
export class RefCodeController {
  @Inject()
  private readonly refCodeService: RefCodeService;

  // @Post("/check-whitelist")
  // async checkWhitelist(
  //   @QueryParams("address") address: string
  // ): Promise<boolean> {
  //   return this.refCodeService.checkWhitelist(address);
  // }

  // // @Post("/create-ref-code")
  // // async createRefCode(
  // //   @QueryParams("refCodeName") refCodeName: string,
  // //   @QueryParams("quantity") quantity: number
  // // ): Promise<string> {
  // //   return await this.refCodeService.createRefCode(refCodeName,quantity);
  // // }

  // @Post("/signUp")
  // async useRefCode(
  //   @QueryParams("refcode") refcode: string,
  //   @QueryParams("address") address: string
  // ): Promise<boolean> {
  //   return this.refCodeService.useRefCode(refcode,address);
  // }
}



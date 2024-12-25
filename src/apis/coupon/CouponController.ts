import { Controller, Inject } from "@tsed/di";
import { Res } from "@tsed/common";
import { Get, Post, Returns,Summary } from "@tsed/schema";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { CouponService } from "./services/CouponService";
import { CouponListDto } from "./dto/CouponListDto";

@Controller("/coupon")
export class CouponController {
  @Inject()
  private readonly couponService: CouponService;

  @Get("/get-coupon-list")
  async getCouponList(
    @QueryParams("couponAddressListId") couponAddressListId: string
  ): Promise<CouponListDto[]> {
    return await this.couponService.getCouponList(couponAddressListId);
  }
}



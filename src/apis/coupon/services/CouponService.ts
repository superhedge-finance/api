import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet, providers, utils} from "ethers";
import { CouponListRepository , CouponList} from "../../../dal";
import { CouponAddressListRepository , CouponAddressList} from "../../../dal";
import { CouponListDto } from "../dto/CouponListDto";

@Injectable()
export class CouponService {

  @Inject(CouponListRepository)
  private readonly couponListRepository: CouponListRepository;

  @Inject(CouponAddressListRepository)
  private readonly couponAddressListRepository: CouponAddressListRepository;

  async saveCouponList(couponAddressListId: string, address: string[], balance: number[]): Promise<boolean> {
    const couponAddressList = new CouponAddressList();
    couponAddressList.couponAddressListId = couponAddressListId;
    couponAddressList.transactionHash = "";
    couponAddressList.address = address;
    couponAddressList.balance = balance;
    await this.couponAddressListRepository.save(couponAddressList);
    return true;
  }

  private generateUniqueCode(productAddress: string): string {
    // Combine productAddress with a timestamp to ensure uniqueness
    const timestamp = Date.now().toString();
    const combinedString = productAddress + timestamp;
    const hash = utils.keccak256(utils.toUtf8Bytes(combinedString));
    return hash.substring(2, 7); // Take the first 5 characters after '0x'
  }

  async initCouponCode(productAddress: string): Promise<string> {
    const uniqueCode = this.generateUniqueCode(productAddress);
    const couponList = new CouponList();
    couponList.productAddress = productAddress;
    couponList.transactionStatus = false;
    couponList.couponAddressListId = uniqueCode;
    await this.couponListRepository.save(couponList);
    return uniqueCode;
  }

  async getCouponList(couponAddressListId: string): Promise<CouponListDto[]> {
    const couponAddressLists = await this.couponAddressListRepository.find({ where: { couponAddressListId: couponAddressListId } });
    if (!couponAddressLists || couponAddressLists.length === 0) {
      throw new Error("Coupon address list not found");
    }
    return couponAddressLists.map(couponAddressList => {
      const couponListDto = new CouponListDto();
      couponListDto.address = couponAddressList.address;
      couponListDto.balance = couponAddressList.balance;
      return couponListDto;
    });
  }
  
}


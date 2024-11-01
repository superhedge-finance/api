import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet, providers, utils} from "ethers";
import { RefCodeRepository , RefCode, Product} from "../../dal";



@Injectable()
export class RefCodeService {

  @Inject(RefCodeRepository)
  private readonly refCodeRepository: RefCodeRepository;

  async checkWhitelist(address: string): Promise<boolean> {
    const refCode = await this.refCodeRepository.findOne({
      where: {
        address: Not(""),
      }
    });
    console.log(refCode)
    return !!refCode && refCode.address?.includes(address);
  }

  async createRefCode(refCodeName: string, quantity: number): Promise<string> {
    console.log(refCodeName, quantity)
    const existingCode = await this.refCodeRepository.findOne({
      where: {
        refCode: refCodeName,
        quantity: quantity
      }
    });
    console.log(existingCode)
    if (existingCode) {
      throw new Error('RefCode name already exists');
    }
  
    const newRefCode = new RefCode();
    newRefCode.refCode = refCodeName;
    newRefCode.quantity = quantity;
    newRefCode.usedCount = 0; // Initialize used count
  
    await this.refCodeRepository.save(newRefCode);
  
    return refCodeName;
  }
  
  async useRefCode(refCode: string, address: string): Promise<boolean> {
    // Find the ref code record
    const refCodeRecord = await this.refCodeRepository.findOne({
      where: {
        refCode: refCode
      }
    });

    // If ref code doesn't exist, return false
    if (!refCodeRecord) {
      return false;
    }

    // If address already exists in the record, return false
    if (refCodeRecord.address && refCodeRecord.address.includes(address)) {
      return false;
    }

    // If usedCount is greater than or equal to quantity, return false
    if (refCodeRecord.usedCount >= refCodeRecord.quantity) {
      return false;
    }

    // Add the address to the addresses array
    refCodeRecord.address = refCodeRecord.address || [];
    refCodeRecord.address.push(address);

    // Increment the usedCount
    refCodeRecord.usedCount += 1;

    // Save the updated ref code record
    await this.refCodeRepository.save(refCodeRecord);

    return true;
  }
}


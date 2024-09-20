import { BigNumber, ethers, FixedNumber } from "ethers";
import { Repository } from "typeorm";
import { History } from "../entity";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../shared/enum";
import { DECIMAL } from "../../shared/constants";

export class HistoryRepository extends Repository<History> {
  createHistory = async (
    chainId: number,
    address: string,
    amount: BigNumber,
    transactionHash: string,
    logIndex: number,
    type: HISTORY_TYPE,
    withdrawType: WITHDRAW_TYPE,
    productId: number,
    tokenId?: BigNumber,
    supply?: BigNumber,
    from?: string
  ) => {
    const exist = await this.findOne({ where: { transactionHash, logIndex } });
    if (!exist) {
      const lastEntity = await this.findOne(
        { where: { chainId, address }, order: { created_at: 'DESC' }}
      );
      let totalBalance = FixedNumber.from(0);
      if (lastEntity) totalBalance = FixedNumber.from(lastEntity.totalBalance);
      
      try {
        const entity = new History();
        entity.address = address;
        entity.chainId = chainId;
        entity.type = type;
        entity.withdrawType = withdrawType;
        entity.productId = productId;
        entity.amount = amount.toString();
        // entity.amountInDecimal = Number(ethers.utils.formatUnits(amount, DECIMAL[chainId]));
        entity.amountInDecimal = Number(amount);
        if (type == HISTORY_TYPE.WITHDRAW) {
          entity.totalBalance = (totalBalance.subUnsafe(FixedNumber.from(entity.amountInDecimal))).toString();
        } else {
          entity.totalBalance = (totalBalance.addUnsafe(FixedNumber.from(entity.amountInDecimal))).toString();
        }
        entity.transactionHash = transactionHash;
        entity.logIndex = logIndex;
        if (tokenId) {
          entity.tokenId = tokenId.toString();
        }
        if (supply) {
          entity.supply = supply.toString();
          entity.supplyInDecimal = supply.toNumber();
        }
        if (type == HISTORY_TYPE.TRANSFER) {
          const seller = await this.findOne(
            { where: { address: from, chainId: chainId }, order: { created_at: 'DESC' }}
          );
          if (seller) {
            const prevTotalBal = FixedNumber.from(seller.totalBalance);
            seller.totalBalance = (prevTotalBal.subUnsafe(FixedNumber.from(entity.amountInDecimal))).toString();
            this.save(seller);
          }
        }
        if (from) entity.from = from;
        return this.save(entity);
      } catch (e){
        console.log(e);
      }
    }
  };
}

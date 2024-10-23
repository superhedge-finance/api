import { registerProvider } from "@tsed/di";
import { $log } from "@tsed/common";
import { Logger } from "@tsed/logger";
import { PlatformExpress } from "@tsed/platform-express";
import { Server } from "./Server";
import {
  Product,
  ProductRepository,
  SuperHedgeDataSource,
  User,
  WithdrawRequest,
  UserRepository,
  WithdrawRequestRepository,
  HistoryRepository,
  History,
  // HistoryPresaleRepository,
  // HistoryPresale
} from "./dal";

registerProvider({
  provide: SuperHedgeDataSource,
  type: "typeorm:datasource",
  deps: [Logger],
  async useAsyncFactory(logger: Logger) {
    await SuperHedgeDataSource.initialize();
    logger.info("Connected with typeorm to database: PostgreSQL");
    return SuperHedgeDataSource;
  },
  hooks: {
    $onDestroy(dataSource) {
      return dataSource.isInitialized && dataSource.destroy();
    },
  },
});

registerProvider({
  provide: UserRepository,
  useValue: new UserRepository(User, SuperHedgeDataSource.createEntityManager()),
});

registerProvider({
  provide: ProductRepository,
  useValue: new ProductRepository(Product, SuperHedgeDataSource.createEntityManager()),
});

registerProvider({
  provide: WithdrawRequestRepository,
  useValue: new WithdrawRequestRepository(WithdrawRequest, SuperHedgeDataSource.createEntityManager()),
});

registerProvider({
  provide: HistoryRepository,
  useValue: new HistoryRepository(History, SuperHedgeDataSource.createEntityManager()),
});

// registerProvider({
//   provide: HistoryPresaleRepository,
//   useValue: new HistoryPresaleRepository(HistoryPresale, SuperHedgeDataSource.createEntityManager()),
// });

async function bootstrap() {
  try {
    const platform = await PlatformExpress.bootstrap(Server);
    await platform.listen();

    process.on("SIGINT", () => {
      platform.stop();
    });
  } catch (error) {
    $log.error({ event: "SERVER_BOOTSTRAP_ERROR", message: error.message, stack: error.stack });
  }
}

bootstrap();

import { join } from "path";
import { Configuration, Inject } from "@tsed/di";
import { PlatformApplication } from "@tsed/common";
import "@tsed/platform-express"; // Keep this import
import "@tsed/ajv";
import "@tsed/swagger";
// import "@tsed/typegraphql"; // disable GraphQL on Vercel unless configured
import "@tsed/platform-views";
import "@tsed/engines";
import "./datasources/index";
// import "./resolvers/index"; // remove GraphQL resolvers
import { config } from "./config";
import * as pages from "./pages";
import * as apis from "./apis";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import methodOverride from "method-override";
import bodyParser from "body-parser";

// Import the Webhook Controller
import { WebhookController } from "./apis/event/WebhookController";

@Configuration({
  ...config,
  acceptMimes: ["application/json", "image/png", "text/csv"],
  // In serverless/Vercel we don't bind ports inside the app
  httpPort: false,
  httpsPort: false,
  componentsScan: false,
  mount: {
    "/": [...Object.values(pages)],
    "/api": [...Object.values(apis)],
    "/webhook": [WebhookController], // Mount the webhook controller here
  },
  swagger: [
    {
      path: "/doc",
      specVersion: "3.0.1",
    },
  ],
  middlewares: [
    cors(),
    cookieParser(),
    compression(),
    methodOverride(),
    bodyParser.json(),
    { use: bodyParser.urlencoded({ extended: true }) },
  ],
  views: {
    root: join(process.cwd(), "views"),
    viewEngine: "ejs",
  },
  exclude: ["**/*.spec.ts"],
})
export class Server {
  @Inject()
  protected app: PlatformApplication;

  @Configuration()
  protected settings: Configuration;

  // Optional: You can define a method to configure additional settings or routes if needed
  $onInit() {
    // Any additional initialization logic can go here
  }
}
// src/controllers/webhookController.ts
import { Controller, Post, BodyParams, Res } from "@tsed/common";
import { Response } from "express";
import { Inject, Injectable } from "@tsed/di";
// import { WebhookService } from "./webhookService";
import { WebhookService } from "./services/WebhookService";
import { BigNumber, ethers, FixedNumber, Contract , Wallet} from "ethers";
import Web3 from 'web3';

@Controller("/api")
export class WebhookController {
//   constructor(private webhookService: WebhookService) {}
    @Inject()
    private readonly WebhookService: WebhookService;

    @Post()
    async handleWebhook(@BodyParams() body: any, @Res() res: Response) {
    try {
        const providedSignature = res.req.headers["x-signature"]
        const generatedSignature= Web3.utils.sha3(JSON.stringify(res.req.body)+process.env.MORALIS_STREAM_API_KEY)
        
        // console.log(generatedSignature)
        // console.log(providedSignature)
        if(body.abi.length != 0)
            {
                
                if (body.confirmed && generatedSignature === providedSignature)
                {
                    await this.WebhookService.handleWebhook(body)
                }
            }
        else
        {
            if (generatedSignature === providedSignature)
            {
                return res.status(200).json({ message: "Webhook received successfully" });
            }
        }
    } catch (e) {
        console.error(e);
        return res.status(400).json({ error: "Failed to process webhook" });
    }
    }

}


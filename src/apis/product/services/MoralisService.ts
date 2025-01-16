// import { Inject, Injectable } from "@tsed/di";

// import Moralis from 'moralis';
// Moralis.start({
//   apiKey: process.env.MORALIS_API_KEY_SDK
// });
// const streamId = process.env.MORALIS_STREAM_ID as string

// @Injectable()
// export class MoralisService {
//   async addProductAddressIntoStream(productAddress: string)
//   {
//     try {      
//       // MORALIS_API_KEY_SDK
//       const response = await Moralis.Streams.addAddress({
//         "id": streamId,
//         "address": [productAddress]
//       });
//       console.log(response.raw);
//     } catch (e) {
//       console.error(e);
//     }
//   }
// }

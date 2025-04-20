import { Router, Worker } from "mediasoup/types";
import { mediaSoup_config } from "../config/keys.js";

const createRouter = async (workersArry: Worker[], routers: Router[]) => {
  for (const worker of workersArry) {
    const router = await worker.createRouter({
      mediaCodecs: mediaSoup_config.router_codecs,
    });
    routers.push(router);
  }
};
export default createRouter;
// testing git tracking

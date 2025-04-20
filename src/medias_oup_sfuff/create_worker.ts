import * as mediasoup from "mediasoup";
import { mediaSoup_config } from "../config/keys.js";

const createWorker = async (
  numberOfWorkers: number = mediaSoup_config.cpus.length
) => {
  //   console.log(mediasoup.version);
  const workerArry: mediasoup.types.Worker[] = [];
  for (let i = 0; i < numberOfWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: mediaSoup_config.worker.loglevel,
    });
    console.log(" worker pid - ", worker.pid);
    worker.on("died", (error: Error) => {
      console.error("mediasoup worker died!: %o", error);
    });
    workerArry.push(worker);
  }

  // const rtpCapabilities = mediasoup.getSupportedRtpCapabilities();

  // console.log("cap\n", rtpCapabilities);
  return workerArry;
};

export { createWorker };

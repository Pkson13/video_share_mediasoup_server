import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";

//keys
import { keys, mediaSoup_config } from "./config/keys.js";

//mediasoup
import { createWorker } from "./medias_oup_sfuff/create_worker.js";
import createRouter from "./medias_oup_sfuff/create_router.js";
import { Producer, Router, Transport } from "mediasoup/types";
import { TransportOptions } from "mediasoup-client/types";
// import { types as mstypes } from "mediasoup";

const app = express();
const httpServer = createServer(keys, app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173"],
  },
  // /* options */
});

//intitalize a media soup worker
const routersArray: Router[] = [];
const workersArry = await createWorker(1);
const transportArray: Transport[] = [];
const producers: Producer[] = [];

app.use(express.static("./public"));
app.get("/", (req, res) => {
  console.log("hello");
});

io.on("connection", (socket) => {
  // ...
  console.log("id", socket.id);
  createRouter(workersArry, routersArray).then(() => {
    console.log("routers", routersArray);
    for (const r of routersArray) {
      console.log(r.rtpCapabilities);
      socket.emit("routerRtpCapabilities", r.rtpCapabilities);
    }
  });

  socket.on("serverCreateWebRtcTransport", async (callback) => {
    console.log("serverCreateWebRtcTransport");
    const transportOptions: TransportOptions = {} as TransportOptions;
    for (const r of routersArray) {
      //you have to check for a specific router
      //doing this coz i passed 1 to the createworker funtion so there will only be one woker
      const transport = await r.createWebRtcTransport(
        mediaSoup_config.webRtcTransportOptions
      );
      transportOptions.id = transport.id;
      transportOptions.iceParameters = transport.iceParameters;
      transportOptions.iceCandidates = transport.iceCandidates;
      transportOptions.dtlsParameters = transport.dtlsParameters;
      transportArray.push(transport);
    }
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // console.log("waiting");
    callback(transportOptions);
  });
  socket.on("transport-connect", async (dtlsParameters, callback) => {
    console.log("transport-connect");
    // const transportOptions: TransportOptions = {} as TransportOptions;
    //you have to check for a specific transport
    //doing this coz i passed 1 to the createworker funtion so there will only be one transport
    for (const t of transportArray) {
      await t.connect({ dtlsParameters: dtlsParameters });
    }
    console.log(dtlsParameters);
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // console.log("waiting");
    callback("connected");
  });
  socket.on("transport-produce", async (parameters, callback) => {
    console.log("transport-produce");
    // const transportOptions: TransportOptions = {} as TransportOptions;
    //you have to check for a specific transport
    //doing this coz i passed 1 to the createworker funtion so there will only be one transport
    for (const t of transportArray) {
      const producer = await t.produce(parameters);
      console.log(producer);
      producers.push(producer);
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // console.log("waiting");
      callback(producer.id);
    }
  });
});

// console.log(workersArry);

// const resourseusage = await worker.getResourceUsage();
// console.log("ru", resourseusage);
httpServer.listen(3000);

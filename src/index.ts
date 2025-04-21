import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";

//keys
import { keys, mediaSoup_config } from "./config/keys.js";

//mediasoup
import { createWorker } from "./medias_oup_sfuff/create_worker.js";
import createRouter from "./medias_oup_sfuff/create_router.js";
import {
  Consumer,
  Producer,
  Router,
  RtpCapabilities,
  Transport,
  WebRtcTransport,
} from "mediasoup/types";
import { ConsumerOptions, TransportOptions } from "mediasoup-client/types";
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
let consumer: Consumer;

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
  socket.on(
    "serverCreateWebRtcRecieveTransport",
    async (capabilities: RtpCapabilities, callback) => {
      console.log("serverCreateWebRtcRecieveTransport");
      let transport: WebRtcTransport | undefined;
      const transportOptions: TransportOptions = {} as TransportOptions;
      // for (const r of routersArray) {
      if (
        !routersArray[0].canConsume({
          rtpCapabilities: capabilities,
          producerId: producers[0].id,
        })
      ) {
        console.log("cannot consume");
        callback("you cannot consume");
        return;
      }
      console.log("can consume");
      //you have to check for a specific router
      //doing this coz i passed 1 to the createworker funtion so there will only be one woker
      transport = await routersArray[0].createWebRtcTransport(
        mediaSoup_config.webRtcTransportOptions
      );
      transportOptions.id = transport.id;
      transportOptions.iceParameters = transport.iceParameters;
      transportOptions.iceCandidates = transport.iceCandidates;
      transportOptions.dtlsParameters = transport.dtlsParameters;
      transportArray.push(transport);
      // }
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // console.log("waiting");
      // transport!.consume();
      if (!transport) {
        callback("transport was not created");
        return;
      }
      callback(transportOptions);

      consumer = await transport.consume({
        producerId: producers[0].id,
        rtpCapabilities: capabilities,
        paused: true,
      });
      const consumeroptions: ConsumerOptions = {
        id: consumer.id,
        producerId: producers[0].id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
      socket.emit("newConsumer", consumeroptions);
    }
  );

  socket.on("client-consumer-created", (callback) => {
    consumer.resume();
    callback("resumed");
  });

  socket.on("transport-connect", async (dtlsParameters, callback) => {
    console.log("transport-connect");
    // const transportOptions: TransportOptions = {} as TransportOptions;
    //you have to check for a specific transport
    //doing this coz i passed 1 to the createworker funtion so there will only be one transport
    // for (const t of transportArray) {
    await transportArray[0].connect({ dtlsParameters: dtlsParameters });
    // }
    console.log(dtlsParameters);
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // console.log("waiting");
    callback("connected");
  });
  socket.on("transport-connect-consumer", async (dtlsParameters, callback) => {
    console.log("transport-connect-consumer");
    // const transportOptions: TransportOptions = {} as TransportOptions;
    //you have to check for a specific transport
    //doing this coz i passed 1 to the createworker funtion so there will only be one transport
    await transportArray[1].connect({ dtlsParameters: dtlsParameters });
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
    // for (const t of transportArray) {
    const producer = await transportArray[0].produce(parameters);
    console.log(producer);
    producers.push(producer);
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // console.log("waiting");
    callback(producer.id);
    // testing git tracking
    // }
  });
});

// console.log(workersArry);

// const resourseusage = await worker.getResourceUsage();
// console.log("ru", resourseusage);
httpServer.listen(3000);

import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";

//keys
import { keys, mediaSoup_config } from "./config/keys.js";

//mediasoup
import { createWorker } from "./medias_oup_sfuff/create_worker.js";
import createRouter, { findroom } from "./medias_oup_sfuff/create_router.js";
import {
  Consumer,
  Producer,
  Router,
  RtpCapabilities,
  Transport,
  WebRtcTransport,
} from "mediasoup/types";
import { ConsumerOptions, TransportOptions } from "mediasoup-client/types";
import { room } from "./types.js";
import cors from "cors";

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
const workersArry = await createWorker(1);
const transportArray: Transport[] = [];
const producers: Producer[] = [];
let consumer: Consumer;
let rooms: room[] = [];
app.use(express.static("./public"));

// app.use(
//   cors({
//     origin: "https://localhost:5173", // or whatever your frontend port is
//     credentials: true,
//   })
// );
app.get("/", (req, res) => {
  console.log("hello");
});

io.on("connection", (socket) => {
  // ...
  console.log("id", socket.id);
  socket.on("createRoom", (name: string, callback) => {
    const room = {} as room;
    room.name = name;
    console.log(name);
    const worker = workersArry[Math.floor(Math.random() * workersArry.length)];
    createRouter(worker, room).then((router) => {
      // console.log("routers", routersArray);
      // for (const r of routersArray) {
      // console.log(routersArray[0].rtpCapabilities);
      rooms.push(room);
      socket.emit("routerRtpCapabilities", router.rtpCapabilities);
      console.log(rooms);
      callback("created");
      // }
    });
  });

  socket.on("joinroom", (roomname, callback) => {
    const room = findroom(roomname, rooms, callback);
    if (!room) return;
    console.log("join r", room);
    const producerIds: string[] = [] as string[];
    room.producers.forEach((producer) => {
      if (producer.producer) producerIds.push(producer.producer?.id);
    });

    callback({
      routerRtpCapabilities: room.routers[0].rtpCapabilities,
      producerIds: producerIds,
    });
  });

  // socket.on("routerrtpcap", async (callback) => {
  // socket.emit("routerRtpCapabilities", routersArray[0].rtpCapabilities);
  // await new Promise((resolve, rej) => {
  //   setTimeout(resolve, 1500);
  // });
  // callback();
  // });

  socket.on("serverCreateWebRtcTransport", async (roomname, callback) => {
    console.log("serverCreateWebRtcTransport");
    console.log("rooname", roomname);
    const transportOptions: TransportOptions = {} as TransportOptions;
    const room = findroom(roomname, rooms, callback);

    if (!room) {
      return;
    }

    const transport = await room.routers[0].createWebRtcTransport(
      mediaSoup_config.webRtcTransportOptions
    );
    transportOptions.id = transport.id;
    transportOptions.iceParameters = transport.iceParameters;
    transportOptions.iceCandidates = transport.iceCandidates;
    transportOptions.dtlsParameters = transport.dtlsParameters;
    // transportArray.push(transport);
    if (!room.producers) room.producers = [];
    room.producers.push({ transport: transport });
    console.log("trans-id", transport.id);
    console.log(rooms);
    // }
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // console.log("waiting");
    callback(transportOptions);
  });
  socket.on(
    "serverCreateWebRtcRecieveTransport",
    async ({ capabilities, roomname, producerid }, callback) => {
      console.log("serverCreateWebRtcRecieveTransport");
      const room = findroom(roomname, rooms, callback);
      if (!room) return;
      let transport: WebRtcTransport | undefined;
      const transportOptions: TransportOptions = {} as TransportOptions;
      // for (const r of routersArray) {
      const router = room.routers[0];
      if (
        !router.canConsume({
          rtpCapabilities: capabilities,
          producerId: producerid,
        })
      ) {
        console.log("cannot consume");
        callback("you cannot consume");
        return;
      }
      console.log("can consume");
      //you have to check for a specific router
      //doing this coz i passed 1 to the createworker funtion so there will only be one woker
      transport = await router.createWebRtcTransport(
        mediaSoup_config.webRtcTransportOptions
      );
      transportOptions.id = transport.id;
      transportOptions.iceParameters = transport.iceParameters;
      transportOptions.iceCandidates = transport.iceCandidates;
      transportOptions.dtlsParameters = transport.dtlsParameters;
      // transportArray.push(transport);
      if (!room.consumers) room.consumers = [];
      // room.consumers.push({ transport: transport });
      // }
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // console.log("waiting");
      // transport!.consume();
      if (!transport) {
        callback("transport was not created");
        return;
      }
      callback(transportOptions);
      console.log("creting consumer");
      consumer = await transport.consume({
        producerId: producerid,
        rtpCapabilities: capabilities,
        paused: true,
      });
      room.consumers.push({ transport: transport, consumer: consumer });
      const consumeroptions: ConsumerOptions = {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        appData: {
          transportId: transport.id,
        },
      };
      socket.emit("newConsumer", consumeroptions);
    }
  );

  socket.on("client-consumer-created", ({ id, roomname }, callback) => {
    const room = findroom(roomname, rooms, callback);
    if (!room) return;
    console.log(roomname);
    console.log(id);
    const consumer = room.consumers.find((cons) => cons.consumer?.id == id);
    if (consumer == undefined) return;
    consumer.consumer?.resume();
    callback("resumed");
  });

  socket.on(
    "transport-connect",
    async ({ dtlsParameters, transportId, roomname }, callback) => {
      console.log("transport-connect");
      console.log("roomname", roomname);
      console.log("trans-id", transportId);
      // const transportOptions: TransportOptions = {} as TransportOptions;
      //you have to check for a specific transport
      //doing this coz i passed 1 to the createworker funtion so there will only be one transport
      const room = findroom(roomname, rooms, callback);

      if (!room) return;

      const transport = room.producers.find(
        (producer) => producer.transport.id === transportId
      );
      // for (const t of transportArray) {
      if (!transport) {
        callback("transport doesn't exixt");
        return;
      }
      await transport.transport.connect({ dtlsParameters });
      // await room.producers[0].transport.connect({
      //   dtlsParameters: dtlsParameters,
      // });
      // }
      console.log(dtlsParameters);
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // console.log("waiting");
      callback("connected");
    }
  );
  socket.on(
    "transport-connect-consumer",
    async ({ dtlsParameters, roomname, transportId }, callback) => {
      const room = findroom(roomname, rooms, callback);
      if (!room) return;
      console.log("transport-connect-consumer");

      const transport = room.consumers.find(
        (consumer) => consumer.transport.id === transportId
      );
      // for (const t of transportArray) {
      if (!transport) {
        callback("transport doesn't exixt");
        return;
      }
      // const transportOptions: TransportOptions = {} as TransportOptions;
      //you have to check for a specific transport
      //doing this coz i passed 1 to the createworker funtion so there will only be one transport
      await transport.transport.connect({ dtlsParameters: dtlsParameters });
      console.log(dtlsParameters);
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // console.log("waiting");
      callback("connected");
    }
  );
  socket.on(
    "transport-produce",
    async ({ parameters, transportId, roomname }, callback) => {
      console.log("transport-produce");
      console.log("roomname", roomname);

      // const transportOptions: TransportOptions = {} as TransportOptions;
      //you have to check for a specific transport
      //doing this coz i passed 1 to the createworker funtion so there will only be one transport
      // for (const t of transportArray) {
      const room = findroom(roomname, rooms, callback);
      if (!room) return;

      const transport = room.producers.find(
        (producer) => producer.transport.id === transportId
      );
      if (!transport) {
        callback("transport doesn't exist");
        return;
      }
      transport.producer = await transport.transport.produce(parameters);
      // room.producers[0].producer = await room.producers[0].transport.produce(
      //   parameters
      // );

      // todo do the emit logic
      console.log(transport.producer);
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // console.log("waiting");
      callback(transport.producer.id);
      // testing git tracking
      // }
    }
  );
});

// console.log(workersArry);

// const resourseusage = await worker.getResourceUsage();
// console.log("ru", resourseusage);
httpServer.listen(3000);

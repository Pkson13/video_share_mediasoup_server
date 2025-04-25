import { Consumer, Producer, Router, Transport, Worker } from "mediasoup/types";

type producer = {
  transport: Transport;
  producer?: Producer;
};
type consumer = {
  transport: Transport;
  consumer?: Consumer;
};

type room = {
  name: string;
  producers: producer[];
  consumers: consumer[];
  worker: Worker;
  routers: Router[];
};

export { room, producer, consumer };

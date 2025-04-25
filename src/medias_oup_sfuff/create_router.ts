import { Router, Worker } from "mediasoup/types";
import { mediaSoup_config } from "../config/keys.js";
import { room } from "../types.js";

const createRouter = async (workersArry: Worker, room: room) => {
  const router = await workersArry.createRouter({
    mediaCodecs: mediaSoup_config.router_codecs,
  });
  room.routers = [];
  room.routers.push(router);
  return router;
};

const findroom = (
  roomname: string,
  roomArry: room[],
  callback: (msg: string) => void
) => {
  if (roomArry.length == 0) {
    // TODO alert the client that no rooms are available
    callback("room doesn't exist");
  }
  const room = roomArry.find((room) => room.name == roomname);
  if (!room) {
    callback("room doesn't exist");
    return;
  }
  return room;
};

const selectRandomWorker = () => {};
export default createRouter;
export { findroom };
// testing git tracking

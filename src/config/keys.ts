import { readFileSync } from "fs";
import { RtpCodecCapability, WebRtcTransportOptions } from "mediasoup/types";
import { cpus as os_cpus } from "os";

const keys = {
  key: readFileSync("./localhost-key.pem", { encoding: "utf-8" }),
  cert: readFileSync("./localhost.pem", { encoding: "utf-8" }),
} as const;

console.log(Object.keys(os_cpus()));

const mediaSoup_config = {
  cpus: os_cpus(),
  worker: {
    loglevel: "debug",
  },
  router_codecs: [
    // Codec | Supported On	         |  Notes
    // opus	 | All platforms	       |  Best voice codec (low bandwidth, high quality)
    // VP8	 | Chrome, Firefox,      |  Edge	Reliable, lightweight
    // H264	 | Safari, iOS, Android  |  HW	Needed for Apple ecosystem, hardware acceleration
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
    },
    // optionally H264 here
    {
      kind: "video",
      mimeType: "video/H264",
      clockRate: 90000,
      parameters: {
        "packetization-mode": "1",
        "profile-level-id": "42e01f", // baseline profile
      },
    },
  ] as RtpCodecCapability[],
  webRtcTransportOptions: {
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    listenInfos: [
      { protocol: "udp", ip: "0.0.0.0", announcedAddress: "192.168.88.181" },
    ],
  } as WebRtcTransportOptions,
} as const;
export { keys, mediaSoup_config };

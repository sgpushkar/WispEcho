import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

const redisUrl = process.env.REDIS_URL;

let pubClient = null;
let subClient = null;
let redisAdapter = null;

if (redisUrl) {
  try {
    pubClient = new Redis(redisUrl);
    subClient = pubClient.clone();
    redisAdapter = createAdapter(pubClient, subClient);
    console.log("📶 Redis Adapter configured for Socket.io scaling.");
  } catch (error) {
    console.error("❌ Redis connection failed. Falling back to in-memory adapter.", error);
  }
} else {
  console.log("ℹ️ No REDIS_URL provided. Using default in-memory Socket.io adapter.");
}

export { pubClient, subClient, redisAdapter };
export default pubClient;

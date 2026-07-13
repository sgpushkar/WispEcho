import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(accessToken: string): Socket {
  if (socket && socket.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token: accessToken },
    autoConnect: true,
    transports: ["websocket"],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

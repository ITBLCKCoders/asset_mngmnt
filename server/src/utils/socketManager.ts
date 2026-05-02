import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setIoInstance(io: SocketIOServer) {
  ioInstance = io;
}

export function getIoInstance(): SocketIOServer | null {
  return ioInstance;
}

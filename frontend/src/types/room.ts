import type { DeviceInfo } from './signaling';

export interface Room {
  room_id: string;
  created_at: string;
}

export interface Peer extends DeviceInfo {
  isLocal?: boolean;
}

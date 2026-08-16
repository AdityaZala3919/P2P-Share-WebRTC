import { create } from 'zustand';
import type { Peer } from '../types/room';

interface RoomState {
  roomId: string | null;
  passphrase: string | null;
  myPeerId: string | null;
  myDeviceName: string;
  peers: Peer[];
  setRoom: (roomId: string, passphrase: string, myPeerId: string, deviceName: string) => void;
  setPeers: (peers: Peer[]) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (peerId: string) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  passphrase: null,
  myPeerId: null,
  myDeviceName: '',
  peers: [],
  setRoom: (roomId, passphrase, myPeerId, deviceName) => set({ roomId, passphrase, myPeerId, myDeviceName: deviceName }),
  setPeers: (peers) => set({ peers }),
  addPeer: (peer) => set(s => ({ peers: [...s.peers.filter(p => p.peer_id !== peer.peer_id), peer] })),
  removePeer: (peerId) => set(s => ({ peers: s.peers.filter(p => p.peer_id !== peerId) })),
  clearRoom: () => set({ roomId: null, passphrase: null, myPeerId: null, peers: [] }),
}));

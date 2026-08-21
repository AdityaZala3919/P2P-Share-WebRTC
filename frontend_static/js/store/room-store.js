/**
 * Room state observable store.
 */
let state = {
  roomId: null,
  passphrase: null,
  myPeerId: null,
  myDeviceName: "",
  peers: [],
};

const listeners = new Set();

function notify() {
  listeners.forEach(fn => {
    try {
      fn({ ...state });
    } catch (err) {
      console.error("RoomStore listener error:", err);
    }
  });
}

export function setRoom(roomId, passphrase, myPeerId, deviceName) {
  state.roomId = roomId;
  state.passphrase = passphrase;
  state.myPeerId = myPeerId;
  state.myDeviceName = deviceName;
  notify();
}

export function setMyDeviceName(name) {
  state.myDeviceName = name;
  notify();
}

export function setPeers(peers) {
  state.peers = peers;
  notify();
}

export function addPeer(peer) {
  state.peers = [...state.peers.filter(p => p.peer_id !== peer.peer_id), peer];
  notify();
}

export function removePeer(peerId) {
  state.peers = state.peers.filter(p => p.peer_id !== peerId);
  notify();
}

export function clearRoom() {
  state = {
    roomId: null,
    passphrase: null,
    myPeerId: null,
    myDeviceName: "",
    peers: [],
  };
  notify();
}

export function getRoomState() {
  return { ...state };
}

export function subscribeRoom(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
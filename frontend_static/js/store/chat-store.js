/**
 * Chat and transfer state observable store.
 */
let state = {
  messages: [],
  activeTransfers: new Map(),
};

const listeners = new Set();

function notify(eventType, payload) {
  listeners.forEach(fn => {
    try {
      fn({ ...state }, eventType, payload);
    } catch (err) {
      console.error("ChatStore listener error:", err);
    }
  });
}

export function addMessage(msg) {
  const id = crypto.randomUUID();
  const newMsg = {
    ...msg,
    id,
    timestamp: Date.now(),
  };
  state.messages = [...state.messages, newMsg];
  notify("addMessage", newMsg);
  return id;
}

export function addSystemMessage(text) {
  const id = crypto.randomUUID();
  const sysMsg = {
    id,
    type: "system",
    content: text,
    fromPeerId: "system",
    fromDeviceName: "System",
    isLocal: false,
    timestamp: Date.now(),
  };
  state.messages = [...state.messages, sysMsg];
  notify("addMessage", sysMsg);
  return id;
}

export function upsertTransfer(transfer) {
  state.activeTransfers.set(transfer.meta.id, transfer);
  notify("upsertTransfer", transfer);
}

export function getTransfer(id) {
  return state.activeTransfers.get(id);
}

export function clearMessages() {
  state.messages = [];
  state.activeTransfers = new Map();
  notify("clearMessages", null);
}

export function getChatState() {
  return state;
}

export function subscribeChat(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
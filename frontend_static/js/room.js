/**
 * Room page main orchestrator: WebRTC Mesh, Chat Stream, File Transfers, and Encrypted Vault.
 */
import { SignalingClient } from './lib/signaling.js';
import { createPeerConnection, createOffer, handleOffer, handleAnswer, handleIceCandidate } from './lib/webrtc.js';
import { encryptText, decryptText, encryptBinary, decryptBinary } from './lib/crypto.js';
import { fileToChunks, createTransferMeta, reassembleChunks, downloadBlob, CHUNK_SIZE } from './lib/chunker.js';
import { folderToZipFile } from './lib/folder-zip.js';
import { detectDeviceType, getDeviceName, setDeviceName, getOrCreatePeerId } from './lib/device-detect.js';
import { playConnected, playMessage, playTransferComplete, playChime, playError, haptic } from './lib/audio.js';
import { setRoom, setMyDeviceName, addPeer, removePeer, clearRoom, getRoomState, subscribeRoom } from './store/room-store.js';
import { addMessage, addSystemMessage, upsertTransfer, getTransfer, clearMessages, getChatState, subscribeChat } from './store/chat-store.js';
import { showToast } from './ui/toast.js';
import { renderQR } from './ui/qr.js';

let signalingClient = null;
let vaultOpen = false;
let showPassInModal = false;
const peerConnections = new Map();
const peerDeviceInfo = new Map();

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
    setTimeout(() => {
      if (window.lucide) window.lucide.createIcons();
    }, 50);
  }
}

const pathMatch = window.location.pathname.match(/\/room\/([^\/]+)/);
const roomId = pathMatch ? pathMatch[1].toLowerCase() : null;

if (!roomId) {
  window.location.href = '/';
}

const peerId = getOrCreatePeerId();
const deviceType = detectDeviceType();
let myDeviceName = getDeviceName(roomId);

// Desktop Header Elements
const headerRoomId = document.getElementById('header-room-id');
const meshStatusDot = document.getElementById('mesh-status-dot');
const meshStatusText = document.getElementById('mesh-status-text');
const myDeviceNameDisplay = document.getElementById('my-device-name-display');
const peersStripContainer = document.getElementById('peers-strip-container');

// Mobile Header & Sheet Elements
const headerRoomIdMobile = document.getElementById('header-room-id-mobile');
const mobileSheetRoomId = document.getElementById('mobile-sheet-room-id');
const meshStatusDotMobile = document.getElementById('mesh-status-dot-mobile');
const meshStatusTextMobile = document.getElementById('mesh-status-text-mobile');
const peersStripContainerMobile = document.getElementById('peers-strip-container-mobile');
const localPeerPillTextMobile = document.getElementById('local-peer-pill-text-mobile');
const mobileMeshDevicesList = document.getElementById('mobile-mesh-devices-list');
const vaultBadgeDotMobile = document.getElementById('vault-badge-dot-mobile');
const mobileAttachSheet = document.getElementById('mobile-attach-sheet');
const mobileAttachBackdrop = document.getElementById('mobile-attach-backdrop');
const mobileInfoSheet = document.getElementById('mobile-info-sheet');
const mobileMenuDropdown = document.getElementById('mobile-menu-dropdown');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

// Chat & Forms
const chatMessages = document.getElementById('chat-messages');
const emptyState = document.getElementById('empty-state');
const dateSeparator = document.getElementById('date-separator');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');
const btnSendMsg = document.getElementById('btn-send-msg');
const chatInputMobile = document.getElementById('chat-input-mobile');
const chatFormMobile = document.getElementById('chat-form-mobile');
const btnSendMsgMobile = document.getElementById('btn-send-msg-mobile');

// Menus & Modals
const attachMenu = document.getElementById('attach-menu');
const vaultSidebar = document.getElementById('vault-sidebar');
const vaultItemsContainer = document.getElementById('vault-items-container');
const vaultBadgeDot = document.getElementById('vault-badge-dot');
const qrModal = document.getElementById('qr-modal');
const qrContainer = document.getElementById('qr-container');
const modalRoomCode = document.getElementById('modal-room-code');
const modalRoomPassphrase = document.getElementById('modal-room-passphrase');
const unlockOverlay = document.getElementById('unlock-overlay');
const unlockRoomIdDisplay = document.getElementById('unlock-room-id-display');
const unlockForm = document.getElementById('unlock-form');
const unlockPassphraseInput = document.getElementById('unlock-passphrase-input');

if (headerRoomId) headerRoomId.textContent = roomId;
if (headerRoomIdMobile) headerRoomIdMobile.textContent = roomId;
if (mobileSheetRoomId) mobileSheetRoomId.textContent = roomId;
if (modalRoomCode) modalRoomCode.textContent = roomId;
if (myDeviceNameDisplay) myDeviceNameDisplay.textContent = `${myDeviceName} (You)`;
if (localPeerPillTextMobile) localPeerPillTextMobile.textContent = `${myDeviceName} (You)`;

function sendSignal(msg) {
  if (signalingClient) signalingClient.send(msg);
}

function sendToAll(data) {
  peerConnections.forEach(conn => {
    if (conn.dataChannel && conn.dataChannel.readyState === 'open') {
      conn.dataChannel.send(data);
    }
  });
}

function sendToPeer(targetPeerId, data) {
  const conn = peerConnections.get(targetPeerId);
  if (conn && conn.dataChannel && conn.dataChannel.readyState === 'open') {
    conn.dataChannel.send(data);
  }
}

function disconnectAllPeers() {
  peerConnections.forEach(conn => {
    if (conn.pc) conn.pc.close();
  });
  peerConnections.clear();
  peerDeviceInfo.clear();
}

function handleDataChannelMessage(data, fromPeerId) {
  const info = peerDeviceInfo.get(fromPeerId);
  const fromName = info ? info.device_name : 'Peer';

  if (typeof data === 'string') {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'chat') {
        addMessage({
          type: 'text',
          content: msg.text,
          fromPeerId,
          fromDeviceName: fromName,
          isLocal: false,
        });
        playMessage();
        return;
      }
      if (msg.type === 'clipboard') {
        addMessage({
          type: 'clipboard',
          content: msg.text,
          fromPeerId,
          fromDeviceName: fromName,
          isLocal: false,
        });
        playMessage();
        return;
      }
      if (msg.type === 'file-meta') {
        const meta = {
          id: msg.id,
          name: msg.name,
          size: msg.size,
          mimeType: msg.mimeType,
          totalChunks: msg.totalChunks,
          fromPeerId,
          fromDeviceName: fromName,
        };
        const transfer = {
          meta,
          direction: 'receiving',
          status: 'transferring',
          bytesTransferred: 0,
          speed: 0,
          eta: 0,
          startTime: Date.now(),
          chunks: new Map(),
        };
        upsertTransfer(transfer);
        addMessage({
          type: 'transfer',
          content: '',
          fromPeerId,
          fromDeviceName: fromName,
          isLocal: false,
          transferId: msg.id,
        });
        return;
      }
      if (msg.type === 'file-complete') {
        const transfer = getTransfer(msg.id);
        if (transfer && transfer.status !== 'complete') {
          if (transfer.chunks.size >= transfer.meta.totalChunks) {
            try {
              const blob = reassembleChunks(transfer.chunks, transfer.meta.totalChunks, transfer.meta.mimeType);
              const url = URL.createObjectURL(blob);
              transfer.status = 'complete';
              transfer.bytesTransferred = transfer.meta.size;
              transfer.blobUrl = url;
              upsertTransfer(transfer);
              playTransferComplete();
              haptic([50, 50, 100]);
            } catch (err) {
              console.error('Error reassembling file:', err);
            }
          }
        }
        return;
      }
    } catch (e) {
      console.error('Error handling string DC message:', e);
    }
  } else {
    try {
      const view = new DataView(data);
      const headerLen = view.getUint32(0, true);
      if (headerLen <= 0 || headerLen > data.byteLength - 4) {
        console.error('Invalid binary chunk header length:', headerLen);
        return;
      }
      const headerBytes = new Uint8Array(data, 4, headerLen);
      const header = JSON.parse(new TextDecoder().decode(headerBytes));
      if (header.type === 'file-chunk') {
        const chunkData = data.slice(4 + headerLen);
        const transfer = getTransfer(header.id);
        if (transfer) {
          transfer.chunks.set(header.index, chunkData);
          const bytes = transfer.chunks.size * CHUNK_SIZE;
          const elapsed = (Date.now() - transfer.startTime) / 1000;
          const speed = elapsed > 0 ? bytes / elapsed : 0;
          transfer.bytesTransferred = Math.min(bytes, transfer.meta.size);
          transfer.speed = speed;
          transfer.eta = speed > 0 ? (transfer.meta.size - bytes) / speed : 0;
          upsertTransfer(transfer);

          // Auto-reassemble if all chunks are in
          if (transfer.chunks.size >= transfer.meta.totalChunks && transfer.status !== 'complete') {
            try {
              const blob = reassembleChunks(transfer.chunks, transfer.meta.totalChunks, transfer.meta.mimeType);
              const url = URL.createObjectURL(blob);
              transfer.status = 'complete';
              transfer.bytesTransferred = transfer.meta.size;
              transfer.blobUrl = url;
              upsertTransfer(transfer);
              playTransferComplete();
              haptic([50, 50, 100]);
            } catch (err) {
              console.error('Error reassembling completed chunks:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Binary chunk error:', err);
    }
  }
}

function onPeerStateChange(peerIdTarget, connected) {
  const info = peerDeviceInfo.get(peerIdTarget);
  const name = info ? info.device_name : peerIdTarget;
  if (connected) {
    playConnected();
    addSystemMessage(`${name} connected via WebRTC`);
  } else {
    addSystemMessage(`${name} disconnected`);
  }
}

function getOrCreateConnection(peerIdTarget) {
  let conn = peerConnections.get(peerIdTarget);
  if (!conn) {
    conn = createPeerConnection(peerIdTarget, sendSignal, handleDataChannelMessage, onPeerStateChange);
    peerConnections.set(peerIdTarget, conn);
  }
  return conn;
}

async function handleSignalMessage(msg) {
  switch (msg.type) {
    case 'peer-list': {
      const peers = msg.peers || [];
      for (const peer of peers) {
        peerDeviceInfo.set(peer.peer_id, peer);
        addPeer({ ...peer, isLocal: false });
        const conn = getOrCreateConnection(peer.peer_id);
        await createOffer(conn, sendSignal);
      }
      break;
    }
    case 'peer-joined': {
      if (!msg.peer) break;
      peerDeviceInfo.set(msg.peer.peer_id, msg.peer);
      addPeer({ ...msg.peer, isLocal: false });
      break;
    }
    case 'peer-left': {
      if (!msg.peer_id) break;
      const conn = peerConnections.get(msg.peer_id);
      if (conn && conn.pc) conn.pc.close();
      peerConnections.delete(msg.peer_id);
      peerDeviceInfo.delete(msg.peer_id);
      removePeer(msg.peer_id);
      break;
    }
    case 'offer': {
      if (!msg.from_peer) break;
      const info = peerDeviceInfo.get(msg.from_peer);
      if (info) addPeer({ ...info, isLocal: false });
      const conn = getOrCreateConnection(msg.from_peer);
      await handleOffer(conn, msg.payload, sendSignal);
      if (conn.dataChannel) {
        conn.dataChannel.onmessage = (e) => handleDataChannelMessage(e.data, msg.from_peer);
      }
      break;
    }
    case 'answer': {
      if (!msg.from_peer) break;
      const conn = peerConnections.get(msg.from_peer);
      if (conn) await handleAnswer(conn, msg.payload);
      break;
    }
    case 'ice-candidate': {
      if (!msg.from_peer) break;
      const conn = peerConnections.get(msg.from_peer);
      if (conn) await handleIceCandidate(conn, msg.payload);
      break;
    }
  }
}

async function authenticateRoom(passphrase) {
  try {
    const res = await fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });

    if (res.ok) {
      sessionStorage.setItem(`ciphershare_pass_${roomId}`, passphrase);
      setRoom(roomId, passphrase, peerId, myDeviceName);
      modalRoomPassphrase.textContent = '••••••••';
      unlockOverlay.classList.add('hidden');
      
      signalingClient = new SignalingClient(roomId, peerId, myDeviceName, deviceType);
      signalingClient.onMessage(handleSignalMessage);
      signalingClient.connect();

      addSystemMessage(`Connected to room ${roomId}`);
      fetchVaultItems();
      renderPeerStrip();
      refreshIcons();
      return true;
    }
  } catch (err) {
    console.error('Auth error:', err);
  }
  return false;
}

async function initRoom() {
  renderPeerStrip();
  refreshIcons();

  const storedPass = sessionStorage.getItem(`ciphershare_pass_${roomId}`);
  if (storedPass) {
    const ok = await authenticateRoom(storedPass);
    if (ok) return;
  }

  if (window.location.hash) {
    const hashPass = decodeURIComponent(window.location.hash.substring(1));
    if (hashPass) {
      const ok = await authenticateRoom(hashPass);
      if (ok) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }
    }
  }

  unlockRoomIdDisplay.textContent = roomId;
  unlockOverlay.classList.remove('hidden');
  unlockPassphraseInput.focus();
  refreshIcons();
}

unlockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = unlockPassphraseInput.value.trim();
  if (!pass) return;

  const btn = document.getElementById('btn-submit-unlock');
  btn.disabled = true;
  btn.textContent = 'Verifying...';

  const ok = await authenticateRoom(pass);
  if (!ok) {
    showToast('Invalid room passphrase');
    btn.disabled = false;
    btn.textContent = 'Unlock & Join';
  }
});

async function sendFile(file) {
  const { myPeerId, myDeviceName: devName } = getRoomState();
  const id = crypto.randomUUID();
  const meta = createTransferMeta(file, id);
  const transfer = {
    meta,
    direction: 'sending',
    status: 'transferring',
    bytesTransferred: 0,
    speed: 0,
    eta: 0,
    startTime: Date.now(),
    chunks: new Map(),
  };

  upsertTransfer(transfer);
  addMessage({
    type: 'transfer',
    content: '',
    fromPeerId: myPeerId || '',
    fromDeviceName: devName,
    isLocal: true,
    transferId: id,
  });

  sendToAll(JSON.stringify({ type: 'file-meta', ...meta }));

  for await (const chunk of fileToChunks(file)) {
    const header = JSON.stringify({ type: 'file-chunk', id, index: chunk.index, total: chunk.total });
    const headerBytes = new TextEncoder().encode(header);
    const combined = new Uint8Array(4 + headerBytes.length + chunk.data.byteLength);
    const view = new DataView(combined.buffer);
    view.setUint32(0, headerBytes.length, true);
    combined.set(headerBytes, 4);
    combined.set(new Uint8Array(chunk.data), 4 + headerBytes.length);

    // Flow control backpressure to avoid WebRTC buffer overflow
    for (const conn of peerConnections.values()) {
      if (conn.dataChannel && conn.dataChannel.readyState === 'open') {
        while (conn.dataChannel.bufferedAmount > 512 * 1024) {
          await new Promise(r => setTimeout(r, 10));
        }
      }
    }

    sendToAll(combined.buffer);

    const elapsed = (Date.now() - transfer.startTime) / 1000;
    const bytes = (chunk.index + 1) * CHUNK_SIZE;
    const speed = elapsed > 0 ? bytes / elapsed : 0;
    const remaining = meta.size - bytes;
    transfer.bytesTransferred = Math.min(bytes, meta.size);
    transfer.speed = speed;
    transfer.eta = speed > 0 ? remaining / speed : 0;
    upsertTransfer(transfer);
  }

  // Small pause before sending complete signal so in-flight chunks land
  await new Promise(r => setTimeout(r, 50));
  sendToAll(JSON.stringify({ type: 'file-complete', id }));
  transfer.status = 'complete';
  transfer.bytesTransferred = meta.size;
  upsertTransfer(transfer);
  playTransferComplete();
  haptic([50, 50, 100]);
}

function handleSendText(text) {
  const { myPeerId, myDeviceName: devName } = getRoomState();
  if (!myPeerId) return;

  const isClipboard = text.startsWith('📋 ');
  const cleanText = isClipboard ? text.replace(/^📋 /, '') : text;

  sendToAll(JSON.stringify({
    type: isClipboard ? 'clipboard' : 'chat',
    text: cleanText,
    deviceName: devName,
  }));

  addMessage({
    type: isClipboard ? 'clipboard' : 'text',
    content: cleanText,
    fromPeerId: myPeerId,
    fromDeviceName: devName,
    isLocal: true,
  });

  playChime();
}

// Desktop chat form
if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInput.value.trim();
    if (!val) return;
    handleSendText(val);
    chatInput.value = '';
  });
}

// Mobile chat form
if (chatFormMobile) {
  chatFormMobile.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInputMobile.value.trim();
    if (!val) return;
    handleSendText(val);
    chatInputMobile.value = '';
  });
}

const inputFile = document.getElementById('input-file');
const inputFolder = document.getElementById('input-folder');
const inputMedia = document.getElementById('input-media');
const btnAttachToggle = document.getElementById('btn-attach-toggle');

if (btnAttachToggle) {
  btnAttachToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    attachMenu.classList.toggle('hidden');
    refreshIcons();
  });
}

document.addEventListener('click', () => {
  if (attachMenu) attachMenu.classList.add('hidden');
});

if (attachMenu) {
  attachMenu.addEventListener('click', (e) => e.stopPropagation());
}

// Mobile attachment sheet controller
function toggleMobileAttachSheet(force) {
  if (!mobileAttachSheet || !mobileAttachBackdrop) return;
  const shouldOpen = typeof force === 'boolean' ? force : mobileAttachSheet.classList.contains('translate-y-full');
  if (shouldOpen) {
    mobileAttachSheet.classList.remove('translate-y-full');
    mobileAttachBackdrop.classList.remove('hidden');
  } else {
    mobileAttachSheet.classList.add('translate-y-full');
    mobileAttachBackdrop.classList.add('hidden');
  }
  refreshIcons();
}

function toggleMobileRoomInfo(show) {
  if (!mobileInfoSheet) return;
  if (show) mobileInfoSheet.classList.remove('hidden');
  else mobileInfoSheet.classList.add('hidden');
  refreshIcons();
}

function toggleMobileMenu(force) {
  if (!mobileMenuDropdown) return;
  const shouldOpen = typeof force === 'boolean' ? force : mobileMenuDropdown.classList.contains('hidden');
  if (shouldOpen) {
    mobileMenuDropdown.classList.remove('hidden');
  } else {
    mobileMenuDropdown.classList.add('hidden');
  }
  refreshIcons();
}

// Close mobile dropdown when tapping outside
document.addEventListener('click', (e) => {
  if (mobileMenuDropdown && !mobileMenuDropdown.classList.contains('hidden')) {
    if (!mobileMenuDropdown.contains(e.target) && mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
      mobileMenuDropdown.classList.add('hidden');
    }
  }
});

// Mobile Bottom Bar Buttons
const btnAttachToggleMobile = document.getElementById('btn-attach-toggle-mobile');
if (btnAttachToggleMobile) {
  btnAttachToggleMobile.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileAttachSheet();
  });
}

if (mobileAttachBackdrop) {
  mobileAttachBackdrop.addEventListener('click', () => toggleMobileAttachSheet(false));
}

const btnCloseMobileAttach = document.getElementById('btn-close-mobile-attach');
if (btnCloseMobileAttach) {
  btnCloseMobileAttach.addEventListener('click', () => toggleMobileAttachSheet(false));
}

const btnCancelMobileAttach = document.getElementById('btn-cancel-mobile-attach');
if (btnCancelMobileAttach) {
  btnCancelMobileAttach.addEventListener('click', () => toggleMobileAttachSheet(false));
}

// Desktop Attachment Menu Buttons
const btnAttachDoc = document.getElementById('btn-attach-doc');
if (btnAttachDoc) {
  btnAttachDoc.addEventListener('click', () => {
    if (attachMenu) attachMenu.classList.add('hidden');
    if (inputFile) inputFile.click();
  });
}

const btnAttachFolder = document.getElementById('btn-attach-folder');
if (btnAttachFolder) {
  btnAttachFolder.addEventListener('click', () => {
    if (attachMenu) attachMenu.classList.add('hidden');
    if (inputFolder) inputFolder.click();
  });
}

const btnAttachMedia = document.getElementById('btn-attach-media');
if (btnAttachMedia) {
  btnAttachMedia.addEventListener('click', () => {
    if (attachMenu) attachMenu.classList.add('hidden');
    if (inputMedia) inputMedia.click();
  });
}

// Mobile Sheet Action Buttons
const btnMobileAttachDoc = document.getElementById('btn-mobile-attach-doc');
if (btnMobileAttachDoc) {
  btnMobileAttachDoc.addEventListener('click', () => {
    toggleMobileAttachSheet(false);
    if (inputFile) inputFile.click();
  });
}

const btnMobileAttachFolder = document.getElementById('btn-mobile-attach-folder');
if (btnMobileAttachFolder) {
  btnMobileAttachFolder.addEventListener('click', () => {
    toggleMobileAttachSheet(false);
    if (inputFolder) inputFolder.click();
  });
}

const btnMobileAttachMedia = document.getElementById('btn-mobile-attach-media');
if (btnMobileAttachMedia) {
  btnMobileAttachMedia.addEventListener('click', () => {
    toggleMobileAttachSheet(false);
    if (inputMedia) inputMedia.click();
  });
}

const btnMobileAttachCamera = document.getElementById('btn-mobile-attach-camera');
if (btnMobileAttachCamera) {
  btnMobileAttachCamera.addEventListener('click', () => {
    toggleMobileAttachSheet(false);
    snapCameraPhoto();
  });
}

const btnMobileAttachScreen = document.getElementById('btn-mobile-attach-screen');
if (btnMobileAttachScreen) {
  btnMobileAttachScreen.addEventListener('click', () => {
    toggleMobileAttachSheet(false);
    captureScreenSnippet();
  });
}

const btnMobileAttachVault = document.getElementById('btn-mobile-attach-vault');
if (btnMobileAttachVault) {
  btnMobileAttachVault.addEventListener('click', () => {
    toggleMobileAttachSheet(false);
    vaultOpen = true;
    if (vaultSidebar) {
      vaultSidebar.classList.remove('translate-x-full');
      fetchVaultItems();
    }
    refreshIcons();
  });
}

/* =========================================================================
   PC Drag & Drop File Sharing
   ========================================================================= */

const dropOverlay = document.getElementById('drop-overlay');
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
    dragCounter++;
    if (dropOverlay) {
      dropOverlay.classList.remove('hidden');
      dropOverlay.classList.add('flex');
    }
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    if (dropOverlay) {
      dropOverlay.classList.add('hidden');
      dropOverlay.classList.remove('flex');
    }
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  if (dropOverlay) {
    dropOverlay.classList.add('hidden');
    dropOverlay.classList.remove('flex');
  }

  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const droppedFiles = Array.from(e.dataTransfer.files);
    showToast(`Streaming ${droppedFiles.length} dropped file${droppedFiles.length > 1 ? 's' : ''} P2P...`);
    droppedFiles.forEach(file => sendFile(file));
  }
});

if (inputFile) {
  inputFile.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => sendFile(f));
    e.target.value = '';
  });
}

if (inputMedia) {
  inputMedia.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => sendFile(f));
    e.target.value = '';
  });
}

if (inputFolder) {
  inputFolder.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    showToast('Packaging folder into ZIP stream...');
    try {
      const zipFile = await folderToZipFile(files);
      await sendFile(zipFile);
      showToast(`Folder ZIP (${files.length} files) sent`);
    } catch (err) {
      showToast('Error packaging folder');
    }
    e.target.value = '';
  });
}

async function snapCameraPhoto() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stream.getTracks().forEach(t => t.stop());
    canvas.toBlob(blob => {
      if (blob) {
        sendFile(new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        showToast('Camera snap sent');
      }
    }, 'image/jpeg', 0.92);
  } catch {
    showToast('Camera permission unavailable');
  }
}

async function captureScreenSnippet() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stream.getTracks().forEach(t => t.stop());
    canvas.toBlob(blob => {
      if (blob) {
        sendFile(new File([blob], `screen_${Date.now()}.png`, { type: 'image/png' }));
        showToast('Screen snippet sent');
      }
    }, 'image/png');
  } catch {}
}

async function triggerClipboardPaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      handleSendText(`📋 ${text}`);
      showToast('📋 Clipboard broadcasted to room');
    } else {
      showToast('Clipboard is empty');
    }
  } catch {
    showToast('Clipboard permission needed or unsupported');
  }
}

const btnAttachCamera = document.getElementById('btn-attach-camera');
if (btnAttachCamera) {
  btnAttachCamera.addEventListener('click', () => {
    if (attachMenu) attachMenu.classList.add('hidden');
    snapCameraPhoto();
  });
}

const btnAttachScreen = document.getElementById('btn-attach-screen');
if (btnAttachScreen) {
  btnAttachScreen.addEventListener('click', () => {
    if (attachMenu) attachMenu.classList.add('hidden');
    captureScreenSnippet();
  });
}

const btnClipboardSend = document.getElementById('btn-clipboard-send');
if (btnClipboardSend) {
  btnClipboardSend.addEventListener('click', triggerClipboardPaste);
}

const btnClipboardSendMobile = document.getElementById('btn-clipboard-send-mobile');
if (btnClipboardSendMobile) {
  btnClipboardSendMobile.addEventListener('click', triggerClipboardPaste);
}

const btnAttachCameraMobile = document.getElementById('btn-attach-camera-mobile');
if (btnAttachCameraMobile) {
  btnAttachCameraMobile.addEventListener('click', snapCameraPhoto);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatSpeed(bps) {
  if (!bps || bps === 0) return '0 B/s';
  if (bps >= 1048576) return `${(bps / 1048576).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

function getFileIconName(filename, mime = '') {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'music';
  if (filename.endsWith('.zip') || filename.endsWith('.tar') || filename.endsWith('.gz')) return 'folder-archive';
  if (filename.endsWith('.pdf') || filename.endsWith('.doc')) return 'file-text';
  return 'file';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPeerStrip() {
  const { peers, myDeviceName: devName } = getRoomState();
  const remotePeers = peers.filter(p => !p.isLocal);
  const totalCount = remotePeers.length + 1;

  // 1. Update Desktop Status & Header
  if (meshStatusDot) meshStatusDot.className = `w-2 h-2 rounded-full inline-block ${remotePeers.length > 0 ? 'bg-app-green' : 'bg-app-green'}`;
  if (meshStatusText) meshStatusText.textContent = `${totalCount} Device${totalCount !== 1 ? 's' : ''} Connected (P2P Mesh)`;

  if (peersStripContainer) {
    peersStripContainer.innerHTML = '<span class="text-[11px] text-app-muted font-mono uppercase tracking-wider">Peers:</span>';
    const localPill = document.createElement('span');
    localPill.className = 'flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-app-card border border-app-cyan/30 text-white text-[11px] shrink-0';
    localPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-app-cyan"></span><span>${escapeHtml(devName || 'Work PC')} (Local)</span>`;
    peersStripContainer.appendChild(localPill);

    remotePeers.forEach(p => {
      const pill = document.createElement('span');
      pill.className = 'flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-app-card border border-app-border text-slate-300 text-[11px] shrink-0 animate-fade-in';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-app-green"></span><span>${escapeHtml(p.device_name || 'Peer')}</span>`;
      peersStripContainer.appendChild(pill);
    });
  }

  // 2. Update Mobile Status & Header
  if (meshStatusDotMobile) meshStatusDotMobile.className = `absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${remotePeers.length > 0 ? 'bg-app-green' : 'bg-app-green'} ring-2 ring-app-sidebar`;
  if (meshStatusTextMobile) meshStatusTextMobile.textContent = `${totalCount} device${totalCount !== 1 ? 's' : ''} online`;

  if (peersStripContainerMobile) {
    peersStripContainerMobile.innerHTML = '<span class="text-[10px] text-app-muted font-mono uppercase shrink-0">Peers:</span>';
    const localChip = document.createElement('span');
    localChip.className = 'flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-app-card border border-app-cyan/40 text-white text-[11px] shrink-0';
    localChip.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-app-cyan"></span><span>${escapeHtml(devName || 'Device')} (You)</span>`;
    peersStripContainerMobile.appendChild(localChip);

    remotePeers.forEach(p => {
      const chip = document.createElement('span');
      chip.className = 'flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-app-card border border-app-border text-slate-300 text-[11px] shrink-0 animate-fade-in';
      chip.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-app-green"></span><span>${escapeHtml(p.device_name || 'Peer')}</span>`;
      peersStripContainerMobile.appendChild(chip);
    });
  }

  // 3. Update Mobile Info Sheet Devices List
  if (mobileMeshDevicesList) {
    mobileMeshDevicesList.innerHTML = `
      <div class="bg-app-card border border-app-cyan/30 rounded-xl p-2.5 flex items-center justify-between">
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-app-cyanDim text-app-cyan flex items-center justify-center shrink-0">
            <i data-lucide="laptop" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <span class="text-xs font-medium text-white block truncate">${escapeHtml(devName || 'Device')} (You)</span>
            <span class="text-[10px] font-mono text-app-cyan">Local Device · Host</span>
          </div>
        </div>
        <button id="btn-mobile-sheet-edit-name" class="text-app-muted hover:text-app-cyan text-xs p-1 cursor-pointer">
          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    remotePeers.forEach(p => {
      const peerIcon = p.device_type === 'mobile' ? 'smartphone' : (p.device_type === 'desktop' ? 'monitor' : 'laptop');
      const devItem = document.createElement('div');
      devItem.className = 'bg-app-card border border-app-border rounded-xl p-2.5 flex items-center justify-between animate-fade-in';
      devItem.innerHTML = `
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-app-green flex items-center justify-center shrink-0">
            <i data-lucide="${peerIcon}" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <span class="text-xs font-medium text-white block truncate">${escapeHtml(p.device_name || 'Peer Device')}</span>
            <span class="text-[10px] font-mono text-app-green">P2P WebRTC Direct</span>
          </div>
        </div>
        <span class="w-2 h-2 rounded-full bg-app-green mr-2 shrink-0"></span>
      `;
      mobileMeshDevicesList.appendChild(devItem);
    });

    const editBtn = document.getElementById('btn-mobile-sheet-edit-name');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const current = getRoomState().myDeviceName;
        const newName = prompt('Enter new nickname for this device:', current);
        if (newName && newName.trim()) {
          const clean = newName.trim();
          setDeviceName(roomId, clean);
          setMyDeviceName(clean);
          myDeviceName = clean;
          if (myDeviceNameDisplay) myDeviceNameDisplay.textContent = `${clean} (You)`;
          renderPeerStrip();
          showToast(`Device renamed to "${clean}"`);
        }
      });
    }
  }

  refreshIcons();
}

function renderMessageElement(msg) {
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (msg.type === 'system') {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-center my-1.5 md:my-2 animate-fade-in';
    div.innerHTML = `<span class="px-3 py-0.5 rounded-full bg-app-sidebar/90 border border-app-border text-[10px] md:text-[11px] font-mono text-app-muted text-center shadow-xs">${escapeHtml(msg.content)}</span>`;
    return div;
  }

  if (msg.type === 'text') {
    const div = document.createElement('div');
    if (msg.isLocal) {
      div.className = 'flex items-start justify-end space-x-2 md:space-x-2.5 ml-auto max-w-[90%] md:max-w-xl animate-fade-in';
      div.innerHTML = `
        <div class="flex flex-col items-end min-w-0">
          <span class="text-[10px] md:text-[11px] font-medium text-app-cyan mb-0.5 mr-1 hidden md:block">${escapeHtml(msg.fromDeviceName)} (You)</span>
          <div class="bg-app-cyanDim border border-app-cyan/40 rounded-2xl rounded-tr-sm px-3.5 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-white shadow-sm leading-relaxed cursor-pointer" onclick="navigator.clipboard.writeText('${escapeHtml(msg.content)}'); window.__showToast('Copied to clipboard');">
            ${escapeHtml(msg.content)}
            <span class="flex items-center justify-end gap-1 text-[9px] md:text-[10px] text-slate-300/80 font-mono text-right mt-1">
              ${time}
              <i data-lucide="check-check" class="w-3 h-3 text-app-cyan"></i>
            </span>
          </div>
        </div>
      `;
    } else {
      div.className = 'flex items-start space-x-2 md:space-x-2.5 max-w-[90%] md:max-w-xl animate-fade-in';
      div.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-green text-xs font-mono shrink-0 mt-0.5">
          <i data-lucide="smartphone" class="w-3.5 h-3.5"></i>
        </div>
        <div class="flex flex-col items-start min-w-0">
          <span class="text-[10px] md:text-[11px] font-medium text-app-muted mb-0.5 ml-1">${escapeHtml(msg.fromDeviceName)}</span>
          <div class="bg-app-card border border-app-border rounded-2xl rounded-tl-sm px-3.5 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-slate-100 shadow-sm leading-relaxed cursor-pointer" onclick="navigator.clipboard.writeText('${escapeHtml(msg.content)}'); window.__showToast('Copied to clipboard');">
            ${escapeHtml(msg.content)}
            <span class="block text-[9px] md:text-[10px] text-app-muted font-mono text-right mt-1">${time}</span>
          </div>
        </div>
      `;
    }
    return div;
  }

  if (msg.type === 'clipboard') {
    const div = document.createElement('div');
    if (msg.isLocal) {
      div.className = 'flex items-start justify-end space-x-2 md:space-x-2.5 ml-auto max-w-[92%] md:max-w-xl animate-fade-in';
      div.innerHTML = `
        <div class="flex flex-col items-end w-full md:w-[380px]">
          <span class="text-[10px] md:text-[11px] font-medium text-app-cyan mb-0.5 mr-1 hidden md:block">${escapeHtml(msg.fromDeviceName)} (You)</span>
          <div class="bg-app-card border border-app-border rounded-2xl rounded-tr-sm p-3 md:p-3.5 w-full shadow-sm">
            <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-app-border text-[11px] text-app-cyan font-mono">
              <span class="flex items-center gap-1"><i data-lucide="clipboard" class="w-3 h-3"></i> CLIPBOARD</span>
              <button onclick="navigator.clipboard.writeText('${escapeHtml(msg.content)}'); window.__showToast('Copied to clipboard');" class="hover:underline flex items-center gap-1 text-[11px] cursor-pointer">
                <i data-lucide="copy" class="w-3 h-3"></i> Copy
              </button>
            </div>
            <p class="text-xs font-mono text-slate-200 break-all leading-relaxed">${escapeHtml(msg.content)}</p>
            <div class="flex items-center justify-end gap-1 text-[9px] md:text-[10px] text-app-muted font-mono text-right mt-1.5">
              <span>${time}</span>
              <i data-lucide="check-check" class="w-3 h-3 text-app-cyan"></i>
            </div>
          </div>
        </div>
      `;
    } else {
      div.className = 'flex items-start space-x-2 md:space-x-2.5 max-w-[92%] md:max-w-xl animate-fade-in';
      div.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-green text-xs font-mono shrink-0 mt-0.5">
          <i data-lucide="monitor" class="w-3.5 h-3.5"></i>
        </div>
        <div class="flex flex-col items-start w-full md:w-[380px]">
          <span class="text-[10px] md:text-[11px] font-medium text-app-muted mb-0.5 ml-1">${escapeHtml(msg.fromDeviceName)}</span>
          <div class="bg-app-card border border-app-border rounded-2xl rounded-tl-sm p-3 md:p-3.5 w-full shadow-sm">
            <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-app-border text-[11px] text-app-cyan font-mono">
              <span class="flex items-center gap-1"><i data-lucide="clipboard" class="w-3 h-3"></i> CLIPBOARD</span>
              <button onclick="navigator.clipboard.writeText('${escapeHtml(msg.content)}'); window.__showToast('Copied to clipboard');" class="hover:underline flex items-center gap-1 text-[11px] cursor-pointer">
                <i data-lucide="copy" class="w-3 h-3"></i> Copy
              </button>
            </div>
            <p class="text-xs font-mono text-slate-200 break-all leading-relaxed">${escapeHtml(msg.content)}</p>
            <span class="block text-[9px] md:text-[10px] text-app-muted font-mono text-right mt-1.5">${time}</span>
          </div>
        </div>
      `;
    }
    return div;
  }

  if (msg.type === 'transfer') {
    const transfer = getTransfer(msg.transferId);
    if (!transfer) return document.createElement('div');

    const percent = transfer.meta.size > 0 ? Math.min((transfer.bytesTransferred / transfer.meta.size) * 100, 100) : 0;
    const iconName = getFileIconName(transfer.meta.name, transfer.meta.mimeType);
    const isLocal = msg.isLocal;

    const div = document.createElement('div');
    div.id = `bubble-transfer-${transfer.meta.id}`;
    div.className = `flex items-start ${isLocal ? 'justify-end ml-auto' : ''} space-x-2 md:space-x-2.5 max-w-[92%] md:max-w-xl animate-fade-in`;

    div.innerHTML = `
      ${!isLocal ? `
        <div class="w-7 h-7 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-green text-xs font-mono shrink-0 mt-0.5">
          <i data-lucide="smartphone" class="w-3.5 h-3.5"></i>
        </div>
      ` : ''}
      <div class="flex flex-col ${isLocal ? 'items-end' : 'items-start'} w-full md:w-[380px]">
        <span class="text-[10px] md:text-[11px] font-medium ${isLocal ? 'text-app-cyan mr-1 hidden md:block' : 'text-app-muted ml-1'} mb-0.5">
          ${escapeHtml(msg.fromDeviceName)} ${isLocal ? '(You)' : ''}
        </span>
        <div class="bg-app-card border ${transfer.status === 'transferring' ? 'border-app-cyan/40' : 'border-app-border'} rounded-2xl ${isLocal ? 'rounded-tr-sm' : 'rounded-tl-sm'} p-3 md:p-3.5 w-full shadow-lg">
          <div class="flex items-center space-x-3 mb-2.5">
            <div class="w-9 h-9 md:w-10 md:h-10 rounded-xl ${isLocal ? 'bg-app-sidebar' : 'bg-app-cyanDim border border-app-cyan/40'} flex items-center justify-center text-app-cyan shrink-0">
              <i data-lucide="${iconName}" class="w-4 h-4 md:w-5 md:h-5"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs font-semibold text-white truncate" title="${escapeHtml(transfer.meta.name)}">${escapeHtml(transfer.meta.name)}</h4>
              <p class="text-[10px] md:text-[11px] text-app-muted font-mono transfer-size-text">
                ${formatBytes(transfer.bytesTransferred)} / ${formatBytes(transfer.meta.size)}
                ${transfer.status === 'transferring' ? ` · <span class="text-app-cyan font-bold">${formatSpeed(transfer.speed)}</span>` : ''}
              </p>
            </div>
            ${transfer.status === 'complete' && !isLocal && transfer.blobUrl ? `
              <button onclick="window.__downloadTransfer('${transfer.meta.id}')" class="px-2.5 py-1 bg-app-sidebar hover:bg-app-cyan hover:text-black border border-app-border text-xs font-mono text-white rounded transition-all flex items-center gap-1 cursor-pointer">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>

          ${transfer.status === 'transferring' ? `
            <div class="w-full bg-app-sidebar h-1.5 rounded-full overflow-hidden mb-2">
              <div class="bg-app-cyan h-full rounded-full transition-all duration-300 transfer-progress-bar" style="width: ${percent}%;"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] md:text-[11px] font-mono text-app-muted transfer-status-row">
              <span class="text-app-green">Streaming P2P (${Math.round(percent)}%)</span>
              <span>ETA: ${transfer.eta < 60 ? `${Math.round(transfer.eta)}s` : `${Math.round(transfer.eta / 60)}m`}</span>
            </div>
          ` : `
            <div class="flex items-center justify-between text-[9px] md:text-[10px] font-mono">
              <span class="text-app-green">✓ ${isLocal ? 'Sent via WebRTC' : 'Received complete'}</span>
              <span class="text-app-muted">${time}</span>
            </div>
          `}
        </div>
      </div>
    `;
    return div;
  }

  return document.createElement('div');
}

function updateTransferBubble(transfer) {
  const el = document.getElementById(`bubble-transfer-${transfer.meta.id}`);
  if (!el) return;

  const percent = transfer.meta.size > 0 ? Math.min((transfer.bytesTransferred / transfer.meta.size) * 100, 100) : 0;
  const sizeText = el.querySelector('.transfer-size-text');
  const progressBar = el.querySelector('.transfer-progress-bar');
  const statusRow = el.querySelector('.transfer-status-row');

  if (sizeText) {
    sizeText.innerHTML = `
      ${formatBytes(transfer.bytesTransferred)} / ${formatBytes(transfer.meta.size)}
      ${transfer.status === 'transferring' ? ` · <span class="text-app-cyan font-bold">${formatSpeed(transfer.speed)}</span>` : ''}
    `;
  }

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }

  if (statusRow) {
    const etaText = transfer.eta < 60 ? `${Math.round(transfer.eta)}s` : `${Math.round(transfer.eta / 60)}m`;
    statusRow.innerHTML = `
      <span class="text-app-green">Streaming P2P (${Math.round(percent)}%)</span>
      <span>ETA: ${etaText}</span>
    `;
  }

  if (transfer.status === 'complete') {
    const newEl = renderMessageElement({
      type: 'transfer',
      transferId: transfer.meta.id,
      fromDeviceName: transfer.meta.fromDeviceName,
      isLocal: transfer.direction === 'sending',
      timestamp: Date.now()
    });
    el.replaceWith(newEl);
    refreshIcons();
  }
}

window.__showToast = showToast;
window.__downloadTransfer = (transferId) => {
  const transfer = getTransfer(transferId);
  if (transfer && transfer.blobUrl) {
    const a = document.createElement('a');
    a.href = transfer.blobUrl;
    a.download = transfer.meta.name;
    a.click();
    showToast(`Saving "${transfer.meta.name}"`);
  }
};

subscribeRoom(() => {
  renderPeerStrip();
  refreshIcons();
});

subscribeChat((state, eventType, payload) => {
  if (eventType === 'addMessage') {
    emptyState.classList.add('hidden');
    dateSeparator.classList.remove('hidden');
    const el = renderMessageElement(payload);
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    refreshIcons();
  } else if (eventType === 'upsertTransfer') {
    updateTransferBubble(payload);
  }
});

let vaultItems = [];

async function fetchVaultItems() {
  const { passphrase } = getRoomState();
  if (!roomId || !passphrase) return;

  try {
    const res = await fetch(`/api/rooms/${roomId}/vault`);
    if (res.ok) {
      vaultItems = await res.json();
      renderVault();
      if (vaultBadgeDot) {
        if (vaultItems.length > 0) vaultBadgeDot.classList.remove('hidden');
        else vaultBadgeDot.classList.add('hidden');
      }
      if (vaultBadgeDotMobile) {
        if (vaultItems.length > 0) vaultBadgeDotMobile.classList.remove('hidden');
        else vaultBadgeDotMobile.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Vault fetch error:', err);
  }
}

async function renderVault() {
  vaultItemsContainer.innerHTML = '';
  const { passphrase } = getRoomState();

  if (vaultItems.length === 0) {
    vaultItemsContainer.innerHTML = `
      <div class="text-center text-xs text-app-muted font-mono py-8 leading-relaxed">
        🔒 Vault is empty.<br />Add private notes or files that stay encrypted in SQLite.
      </div>
    `;
    return;
  }

  for (const item of vaultItems) {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-xl bg-app-card border border-app-border hover:border-app-cyan/50 transition-colors animate-fade-in';

    if (item.type === 'note') {
      let preview = '••••••••';
      try {
        if (passphrase) {
          preview = await decryptText(item.encrypted_data, item.iv, item.salt, passphrase);
        }
      } catch {}

      card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-white">${escapeHtml(item.title)}</span>
          <div class="flex items-center gap-1">
            <button onclick="navigator.clipboard.writeText('${escapeHtml(preview)}'); window.__showToast('Note copied to clipboard');" class="text-app-muted hover:text-app-cyan p-1 cursor-pointer" title="Copy text">
              <i data-lucide="copy" class="w-3 h-3"></i>
            </button>
            <button onclick="window.__deleteVaultItem('${item.id}')" class="text-app-muted hover:text-red-400 p-1 cursor-pointer" title="Delete note">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
          </div>
        </div>
        <p class="text-[11px] font-mono text-app-muted truncate">${escapeHtml(preview)}</p>
        <span class="text-[9px] font-mono text-app-cyan mt-1 block">AES-256-GCM · Stored in DB</span>
      `;
    } else {
      card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
            <i data-lucide="key" class="w-3 h-3 text-app-green shrink-0"></i>
            <span class="truncate">${escapeHtml(item.title || item.file_name)}</span>
          </span>
          <div class="flex items-center gap-1">
            <button onclick="window.__downloadVaultFile('${item.id}')" class="text-app-muted hover:text-app-cyan p-1 cursor-pointer" title="Decrypt & Download">
              <i data-lucide="download" class="w-3 h-3"></i>
            </button>
            <button onclick="window.__deleteVaultItem('${item.id}')" class="text-app-muted hover:text-red-400 p-1 cursor-pointer" title="Delete file">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
          </div>
        </div>
        <p class="text-[11px] font-mono text-app-muted">${formatBytes(item.file_size)} · Persistent Attachment</p>
        <span class="text-[9px] font-mono text-app-green mt-1 block">Zero-Knowledge · SQLite</span>
      `;
    }
    vaultItemsContainer.appendChild(card);
  }

  refreshIcons();
}

window.__deleteVaultItem = async (itemId) => {
  if (!confirm('Are you sure you want to delete this vault item?')) return;
  try {
    await fetch(`/api/rooms/${roomId}/vault/${itemId}`, { method: 'DELETE' });
    showToast('Vault item deleted');
    await fetchVaultItems();
  } catch {
    showToast('Failed to delete item');
  }
};

window.__downloadVaultFile = async (itemId) => {
  const item = vaultItems.find(i => i.id === itemId);
  const { passphrase } = getRoomState();
  if (!item || !passphrase) return;

  try {
    showToast('Decrypting file...');
    const data = await decryptBinary(item.encrypted_data, item.iv, item.salt, passphrase);
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.file_name || item.title || 'vault_file';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    showToast(`Decrypted "${item.file_name || item.title}"`);
  } catch (err) {
    showToast('Decryption failed (Wrong passphrase?)');
  }
};

const vaultNoteEditor = document.getElementById('vault-note-editor');
const vaultNoteTitle = document.getElementById('vault-note-title');
const vaultNoteContent = document.getElementById('vault-note-content');
const btnAddVaultNote = document.getElementById('btn-add-vault-note');
const btnSaveVaultNote = document.getElementById('btn-save-vault-note');
const btnCancelVaultNote = document.getElementById('btn-cancel-vault-note');
const btnAddVaultFile = document.getElementById('btn-add-vault-file');
const inputVaultFile = document.getElementById('input-vault-file');

btnAddVaultNote.addEventListener('click', () => {
  vaultNoteEditor.classList.remove('hidden');
  vaultNoteTitle.focus();
  refreshIcons();
});

btnCancelVaultNote.addEventListener('click', () => {
  vaultNoteEditor.classList.add('hidden');
  vaultNoteTitle.value = '';
  vaultNoteContent.value = '';
});

btnSaveVaultNote.addEventListener('click', async () => {
  const title = vaultNoteTitle.value.trim();
  const content = vaultNoteContent.value.trim();
  const { passphrase } = getRoomState();

  if (!title || !content || !passphrase) {
    showToast('Title and content required');
    return;
  }

  try {
    const { ciphertext, iv, salt } = await encryptText(content, passphrase);
    await fetch(`/api/rooms/${roomId}/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title,
        encrypted_data: ciphertext,
        iv,
        salt
      }),
    });
    vaultNoteEditor.classList.add('hidden');
    vaultNoteTitle.value = '';
    vaultNoteContent.value = '';
    showToast('Encrypted note stored in Vault');
    await fetchVaultItems();
  } catch {
    showToast('Failed to save note');
  }
});

btnAddVaultFile.addEventListener('click', () => {
  inputVaultFile.click();
});

inputVaultFile.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  const { passphrase } = getRoomState();
  if (!file || !passphrase) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('File exceeds 10MB vault limit');
    e.target.value = '';
    return;
  }

  try {
    showToast(`Encrypting "${file.name}"...`);
    const buffer = await file.arrayBuffer();
    const { ciphertext, iv, salt } = await encryptBinary(buffer, passphrase);
    await fetch(`/api/rooms/${roomId}/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'file',
        title: file.name,
        file_name: file.name,
        file_size: file.size,
        encrypted_data: ciphertext,
        iv,
        salt
      }),
    });
    showToast(`"${file.name}" saved to Vault`);
    await fetchVaultItems();
  } catch {
    showToast('Failed to store file in vault');
  }
  e.target.value = '';
});

function toggleVault(force) {
  vaultOpen = typeof force === 'boolean' ? force : !vaultOpen;
  if (vaultOpen) {
    if (vaultSidebar) vaultSidebar.classList.remove('translate-x-full');
    fetchVaultItems();
  } else {
    if (vaultSidebar) vaultSidebar.classList.add('translate-x-full');
  }
  refreshIcons();
}

function openQRModal() {
  if (qrModal) {
    qrModal.classList.remove('hidden');
    updateQR();
    refreshIcons();
  }
}

// Vault Toggle Desktop & Mobile
const btnToggleVault = document.getElementById('btn-toggle-vault');
if (btnToggleVault) {
  btnToggleVault.addEventListener('click', () => toggleVault());
}

const btnToggleVaultMobile = document.getElementById('btn-toggle-vault-mobile');
if (btnToggleVaultMobile) {
  btnToggleVaultMobile.addEventListener('click', () => toggleVault());
}

const btnCloseVault = document.getElementById('btn-close-vault');
if (btnCloseVault) {
  btnCloseVault.addEventListener('click', () => toggleVault(false));
}

function getJoinUrl(includePass) {
  let { passphrase } = getRoomState();
  if (!passphrase && roomId) {
    passphrase = sessionStorage.getItem(`ciphershare_pass_${roomId}`);
  }
  const base = `${window.location.origin}/room/${roomId}`;
  if (includePass && passphrase) {
    return `${base}#${encodeURIComponent(passphrase)}`;
  }
  return base;
}

function updateQR() {
  const togglePass = document.getElementById('toggle-include-pass');
  const includePass = togglePass ? togglePass.checked : true;
  const targetUrl = getJoinUrl(includePass);
  if (qrContainer) renderQR(qrContainer, targetUrl);
  refreshIcons();
}

// Pair QR Modal Desktop & Mobile
const btnOpenPair = document.getElementById('btn-open-pair');
if (btnOpenPair) {
  btnOpenPair.addEventListener('click', openQRModal);
}

const btnOpenPairMobile = document.getElementById('btn-open-pair-mobile');
if (btnOpenPairMobile) {
  btnOpenPairMobile.addEventListener('click', openQRModal);
}

const btnCloseQrModal = document.getElementById('btn-close-qr-modal');
if (btnCloseQrModal) {
  btnCloseQrModal.addEventListener('click', () => {
    if (qrModal) qrModal.classList.add('hidden');
  });
}

if (qrModal) {
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      qrModal.classList.add('hidden');
    }
  });
}

const toggleIncludePass = document.getElementById('toggle-include-pass');
if (toggleIncludePass) {
  toggleIncludePass.addEventListener('change', () => {
    updateQR();
  });
}

const btnCopyModalCode = document.getElementById('btn-copy-modal-code');
if (btnCopyModalCode) {
  btnCopyModalCode.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId);
    showToast(`Room code copied: ${roomId}`);
  });
}

const btnCopyModalPass = document.getElementById('btn-copy-modal-pass');
if (btnCopyModalPass) {
  btnCopyModalPass.addEventListener('click', () => {
    let { passphrase } = getRoomState();
    if (!passphrase && roomId) {
      passphrase = sessionStorage.getItem(`ciphershare_pass_${roomId}`);
    }
    if (passphrase) {
      navigator.clipboard.writeText(passphrase);
      showToast('Passphrase copied to clipboard');
    }
  });
}

const btnTogglePassVisibility = document.getElementById('btn-toggle-pass-visibility');
if (btnTogglePassVisibility) {
  btnTogglePassVisibility.addEventListener('click', () => {
    showPassInModal = !showPassInModal;
    let { passphrase } = getRoomState();
    if (!passphrase && roomId) {
      passphrase = sessionStorage.getItem(`ciphershare_pass_${roomId}`);
    }
    if (modalRoomPassphrase) {
      modalRoomPassphrase.textContent = showPassInModal && passphrase ? passphrase : '••••••••';
    }
  });
}

const btnCopyDirectLink = document.getElementById('btn-copy-direct-link');
if (btnCopyDirectLink) {
  btnCopyDirectLink.addEventListener('click', () => {
    const togglePass = document.getElementById('toggle-include-pass');
    const includePass = togglePass ? togglePass.checked : true;
    const url = getJoinUrl(includePass);
    navigator.clipboard.writeText(url);
    showToast(includePass ? '1-Click Auto-Join link copied!' : 'Direct room link copied!');
  });
}

const btnCopyHeaderRoom = document.getElementById('btn-copy-header-room');
if (btnCopyHeaderRoom) {
  btnCopyHeaderRoom.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId);
    showToast(`Room code copied: ${roomId}`);
  });
}

function promptEditDeviceName() {
  const current = getRoomState().myDeviceName;
  const newName = prompt('Enter new nickname for this device:', current);
  if (newName && newName.trim()) {
    const clean = newName.trim();
    setDeviceName(roomId, clean);
    setMyDeviceName(clean);
    myDeviceName = clean;
    if (myDeviceNameDisplay) myDeviceNameDisplay.textContent = `${clean} (You)`;
    renderPeerStrip();
    showToast(`Device renamed to "${clean}"`);
  }
}

const btnEditDeviceName = document.getElementById('btn-edit-device-name');
if (btnEditDeviceName) {
  btnEditDeviceName.addEventListener('click', promptEditDeviceName);
}

// Mobile Top Bar & Sheet Triggers
const btnMobileOpenInfo = document.getElementById('btn-mobile-open-info');
if (btnMobileOpenInfo) {
  btnMobileOpenInfo.addEventListener('click', () => toggleMobileRoomInfo(true));
}

const btnCloseMobileInfo = document.getElementById('btn-close-mobile-info');
if (btnCloseMobileInfo) {
  btnCloseMobileInfo.addEventListener('click', () => toggleMobileRoomInfo(false));
}

if (mobileInfoSheet) {
  mobileInfoSheet.addEventListener('click', (e) => {
    if (e.target === mobileInfoSheet) {
      toggleMobileRoomInfo(false);
    }
  });
}

const btnMobileSheetCopyCode = document.getElementById('btn-mobile-sheet-copy-code');
if (btnMobileSheetCopyCode) {
  btnMobileSheetCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId);
    showToast(`Room code copied: ${roomId}`);
  });
}

const btnMobileSheetOpenQr = document.getElementById('btn-mobile-sheet-open-qr');
if (btnMobileSheetOpenQr) {
  btnMobileSheetOpenQr.addEventListener('click', () => {
    toggleMobileRoomInfo(false);
    openQRModal();
  });
}

const btnMobileShareLink = document.getElementById('btn-mobile-share-link');
if (btnMobileShareLink) {
  btnMobileShareLink.addEventListener('click', () => {
    const url = getJoinUrl(true);
    navigator.clipboard.writeText(url);
    showToast('Direct room link copied!');
  });
}

// Mobile 3-Dots Popup Menu Triggers
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileMenu();
  });
}

const btnMobileMenuInfo = document.getElementById('btn-mobile-menu-info');
if (btnMobileMenuInfo) {
  btnMobileMenuInfo.addEventListener('click', () => {
    toggleMobileMenu(false);
    toggleMobileRoomInfo(true);
  });
}

const btnMobileMenuPair = document.getElementById('btn-mobile-menu-pair');
if (btnMobileMenuPair) {
  btnMobileMenuPair.addEventListener('click', () => {
    toggleMobileMenu(false);
    openQRModal();
  });
}

const btnMobileMenuVault = document.getElementById('btn-mobile-menu-vault');
if (btnMobileMenuVault) {
  btnMobileMenuVault.addEventListener('click', () => {
    toggleMobileMenu(false);
    toggleVault(true);
  });
}

const btnMobileMenuRename = document.getElementById('btn-mobile-menu-rename');
if (btnMobileMenuRename) {
  btnMobileMenuRename.addEventListener('click', () => {
    toggleMobileMenu(false);
    promptEditDeviceName();
  });
}

const btnMobileMenuCopyLink = document.getElementById('btn-mobile-menu-copy-link');
if (btnMobileMenuCopyLink) {
  btnMobileMenuCopyLink.addEventListener('click', () => {
    toggleMobileMenu(false);
    const url = getJoinUrl(true);
    navigator.clipboard.writeText(url);
    showToast('Direct room link copied!');
  });
}

window.addEventListener('beforeunload', () => {
  disconnectAllPeers();
  if (signalingClient) signalingClient.disconnect();
  clearRoom();
  clearMessages();
});

initRoom();
refreshIcons();

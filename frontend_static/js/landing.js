/**
 * Landing page controller: Create & Join room orchestration + Live Camera QR Scanner.
 */
import { showToast } from "./ui/toast.js";

let mode = "create"; // "create" | "join"
let scannerStream = null;
let scannerAnimationId = null;

const tabCreate = document.getElementById("tab-create");
const tabJoin = document.getElementById("tab-join");
const roomCodeGroup = document.getElementById("room-code-group");
const inputRoomCode = document.getElementById("input-room-code");
const inputPassphrase = document.getElementById("input-passphrase");
const btnSubmit = document.getElementById("btn-submit");
const btnSubmitText = document.getElementById("btn-submit-text");
const landingForm = document.getElementById("landing-form");

// QR Scanner Elements
const btnScanQR = document.getElementById("btn-scan-qr");
const qrScannerModal = document.getElementById("qr-scanner-modal");
const btnCloseScanner = document.getElementById("btn-close-scanner");
const qrVideo = document.getElementById("qr-video");
const qrCanvas = document.getElementById("qr-canvas");
const scannerLoading = document.getElementById("scanner-loading");

function setMode(newMode) {
  mode = newMode;
  if (mode === "create") {
    tabCreate.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer bg-app-cyan text-black shadow-sm";
    tabJoin.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-app-muted hover:text-white";
    roomCodeGroup.classList.add("hidden");
    inputRoomCode.removeAttribute("required");
    btnSubmitText.textContent = "Create Encrypted Room";
  } else {
    tabJoin.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer bg-app-cyan text-black shadow-sm";
    tabCreate.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-app-muted hover:text-white";
    roomCodeGroup.classList.remove("hidden");
    inputRoomCode.setAttribute("required", "true");
    btnSubmitText.textContent = "Join Room";
    inputRoomCode.focus();
  }
}

tabCreate.addEventListener("click", () => setMode("create"));
tabJoin.addEventListener("click", () => setMode("join"));

// Enforce 5-character lowercase alphanumeric input
inputRoomCode.addEventListener("input", (e) => {
  e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
});

// Check if URL has ?join=room_code or #room_code
const urlParams = new URLSearchParams(window.location.search);
const joinParam = urlParams.get("join") || (window.location.hash ? window.location.hash.replace("#", "") : "");
if (joinParam) {
  setMode("join");
  inputRoomCode.value = joinParam.toLowerCase().slice(0, 5);
  inputPassphrase.focus();
}

/* =========================================================================
   Live Camera QR Scanner Implementation
   ========================================================================= */

function stopQRScanner() {
  if (scannerAnimationId) {
    cancelAnimationFrame(scannerAnimationId);
    scannerAnimationId = null;
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  if (qrVideo) {
    qrVideo.srcObject = null;
  }
  qrScannerModal.classList.add("hidden");
  qrScannerModal.classList.remove("flex");
}

async function startQRScanner() {
  qrScannerModal.classList.remove("hidden");
  qrScannerModal.classList.add("flex");
  scannerLoading.classList.remove("hidden");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 720 }, height: { ideal: 720 } }
    });
    scannerStream = stream;
    qrVideo.srcObject = stream;
    await qrVideo.play();
    scannerLoading.classList.add("hidden");
    requestAnimationFrame(scanQRCodeFrame);
  } catch (err) {
    console.error("Camera access error:", err);
    scannerLoading.classList.add("hidden");
    showToast("Camera access denied or unavailable");
    stopQRScanner();
  }
}

function scanQRCodeFrame() {
  if (!scannerStream || qrVideo.readyState !== qrVideo.HAVE_ENOUGH_DATA) {
    scannerAnimationId = requestAnimationFrame(scanQRCodeFrame);
    return;
  }

  const canvas = qrCanvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = qrVideo.videoWidth;
  canvas.height = qrVideo.videoHeight;
  ctx.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  if (window.jsQR) {
    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleScannedQRCode(code.data);
      return;
    }
  }

  scannerAnimationId = requestAnimationFrame(scanQRCodeFrame);
}

function handleScannedQRCode(scannedText) {
  stopQRScanner();

  try {
    let parsedRoom = "";
    let parsedPass = "";

    // Handle full URL or path e.g. https://.../room/a2xa7#myPass
    if (scannedText.includes("/room/")) {
      const parts = scannedText.split("/room/");
      const afterRoom = parts[1] || "";
      
      if (afterRoom.includes("#")) {
        const [code, hash] = afterRoom.split("#");
        parsedRoom = code.split("?")[0].trim().toLowerCase().slice(0, 5);
        parsedPass = decodeURIComponent(hash.trim());
      } else {
        parsedRoom = afterRoom.split("?")[0].split("/")[0].trim().toLowerCase().slice(0, 5);
      }
    } else if (scannedText.includes("#")) {
      const [code, hash] = scannedText.split("#");
      parsedRoom = code.trim().toLowerCase().slice(0, 5);
      parsedPass = decodeURIComponent(hash.trim());
    } else {
      parsedRoom = scannedText.trim().toLowerCase().slice(0, 5);
    }

    if (parsedRoom) {
      setMode("join");
      inputRoomCode.value = parsedRoom;

      if (parsedPass) {
        inputPassphrase.value = parsedPass;
        sessionStorage.setItem(`ciphershare_pass_${parsedRoom}`, parsedPass);
        showToast("QR Verified! Joining room...");
        window.location.href = `/room/${parsedRoom}#${encodeURIComponent(parsedPass)}`;
      } else {
        inputPassphrase.focus();
        showToast(`Room code ${parsedRoom} set. Enter passphrase.`);
      }
    }
  } catch (err) {
    console.error("QR parse error:", err);
    showToast("Invalid QR Code payload");
  }
}

if (btnScanQR) btnScanQR.addEventListener("click", startQRScanner);
if (btnCloseScanner) btnCloseScanner.addEventListener("click", stopQRScanner);

/* =========================================================================
   Form Submission (Create & Join)
   ========================================================================= */

landingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const passphrase = inputPassphrase.value.trim();
  const roomCode = inputRoomCode.value.trim().toLowerCase();

  if (!passphrase) {
    showToast("Please enter a passphrase");
    return;
  }

  btnSubmit.disabled = true;

  if (mode === "create") {
    btnSubmitText.textContent = "Connecting to Mesh...";
    try {
      const res = await fetch("/api/rooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      sessionStorage.setItem(`ciphershare_pass_${data.room_id}`, passphrase);
      window.location.href = `/room/${data.room_id}`;
    } catch (err) {
      showToast("Failed to create room");
      btnSubmit.disabled = false;
      btnSubmitText.textContent = "Create Encrypted Room";
    }
  } else {
    if (!roomCode) {
      showToast("Please enter a room code");
      btnSubmit.disabled = false;
      return;
    }
    btnSubmitText.textContent = "Verifying passphrase...";
    try {
      const res = await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (res.status === 401) throw new Error("Invalid passphrase");
      if (res.status === 404) throw new Error("Room not found");
      if (!res.ok) throw new Error("Error joining room");

      sessionStorage.setItem(`ciphershare_pass_${roomCode}`, passphrase);
      window.location.href = `/room/${roomCode}`;
    } catch (err) {
      showToast(err.message || "Error joining room");
      btnSubmit.disabled = false;
      btnSubmitText.textContent = "Join Room";
    }
  }
});

// Render Lucide icons
if (window.lucide) {
  window.lucide.createIcons();
}
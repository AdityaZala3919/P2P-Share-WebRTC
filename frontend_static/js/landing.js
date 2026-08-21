/**
 * Landing page controller: Create & Join room orchestration.
 */
import { showToast } from "./ui/toast.js";

let mode = "create"; // "create" | "join"

const tabCreate = document.getElementById("tab-create");
const tabJoin = document.getElementById("tab-join");
const roomCodeGroup = document.getElementById("room-code-group");
const inputRoomCode = document.getElementById("input-room-code");
const inputPassphrase = document.getElementById("input-passphrase");
const btnSubmit = document.getElementById("btn-submit");
const btnSubmitText = document.getElementById("btn-submit-text");
const landingForm = document.getElementById("landing-form");

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

inputRoomCode.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// Check if URL has ?join=ROOM_CODE or #ROOM_CODE
const urlParams = new URLSearchParams(window.location.search);
const joinParam = urlParams.get("join") || (window.location.hash ? window.location.hash.replace("#", "") : "");
if (joinParam) {
  setMode("join");
  inputRoomCode.value = joinParam.toUpperCase();
  inputPassphrase.focus();
}

landingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const passphrase = inputPassphrase.value.trim();
  const roomCode = inputRoomCode.value.trim().toUpperCase();

  if (!passphrase) {
    showToast("Please enter a passphrase");
    return;
  }

  btnSubmit.disabled = true;

  if (mode === "create") {
    btnSubmitText.textContent = "Connecting to Mesh...";
    try {
      const res = await fetch("/api/rooms", {
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
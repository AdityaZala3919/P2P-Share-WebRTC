/**
 * Bottom-center toast notification component.
 */
let hideTimer = null;

export function showToast(message) {
  let toastEl = document.getElementById("toast");
  let toastMsgEl = document.getElementById("toast-msg");
  
  if (!toastEl || !toastMsgEl) return;
  
  toastMsgEl.textContent = message;
  toastEl.classList.remove("translate-y-20", "opacity-0");
  toastEl.classList.add("translate-y-0", "opacity-100");
  
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toastEl.classList.remove("translate-y-0", "opacity-100");
    toastEl.classList.add("translate-y-20", "opacity-0");
  }, 2200);
}
/**
 * Dynamic QR Code generator using qrcode CDN.
 */
export async function renderQR(container, text) {
  if (!container) return;
  container.innerHTML = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full rounded-lg shadow-inner';

    if (window.QRCode && window.QRCode.toCanvas) {
      await window.QRCode.toCanvas(canvas, text, {
        width: 176,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      container.appendChild(canvas);
      return;
    }

    // Dynamic import fallback if not on window
    const { default: QRCode } = await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');
    await QRCode.toCanvas(canvas, text, {
      width: 176,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    container.appendChild(canvas);
  } catch (err) {
    console.error('QR Code generation error:', err);
    container.innerHTML = '<div class="text-xs text-red-400 p-4 font-mono">QR Render Error</div>';
  }
}

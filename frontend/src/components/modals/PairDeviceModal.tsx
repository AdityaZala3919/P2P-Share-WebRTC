import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRoomStore } from '../../stores/roomStore';
import { showToast } from '../shared/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PairDeviceModal({ open, onClose }: Props) {
  const { roomId, passphrase } = useRoomStore();
  const [includePass, setIncludePass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  if (!open || !roomId) return null;

  const cleanUrl = `${window.location.origin}/room/${roomId}`;
  const autoJoinUrl = passphrase ? `${cleanUrl}#${encodeURIComponent(passphrase)}` : cleanUrl;
  const targetUrl = includePass ? autoJoinUrl : cleanUrl;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    showToast(`Room code copied: ${roomId}`);
  };

  const handleCopyPassphrase = () => {
    if (passphrase) {
      navigator.clipboard.writeText(passphrase);
      showToast('Passphrase copied to clipboard');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    showToast(includePass ? '1-Click auto-join link copied!' : 'Direct room link copied!');
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0F14] border border-[#1A202C] rounded-3xl max-w-sm w-full p-6 shadow-2xl my-auto select-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Pair Another Device</h3>
            <p className="text-xs text-[#7E8B9B] font-mono mt-0.5">
              Scan QR code or share credentials
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#7E8B9B] hover:text-white transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-lg">
            <QRCodeSVG value={targetUrl} size={180} />
          </div>
        </div>

        {/* Toggle 1-click auto-join */}
        {passphrase && (
          <div className="flex items-center justify-between bg-[#131720] border border-[#1A202C] rounded-2xl px-4 py-2.5 mb-3">
            <div className="text-left">
              <span className="text-xs text-slate-100 block font-semibold">1-Click Auto Join</span>
              <span className="text-[11px] text-[#7E8B9B] block font-mono">Includes passphrase in URL hash</span>
            </div>
            <input
              type="checkbox"
              checked={includePass}
              onChange={e => setIncludePass(e.target.checked)}
              className="accent-[#00FFFF] h-5 w-5 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Room code row */}
        <div className="bg-[#131720] border border-[#1A202C] rounded-2xl p-3 flex items-center justify-between mb-2.5">
          <div>
            <span className="text-[10px] text-[#7E8B9B] block font-mono font-bold">ROOM CODE</span>
            <span className="text-sm font-mono font-bold text-[#00FFFF] tracking-widest">{roomId}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-[#0D0F14] hover:border-[#00FFFF] border border-[#1A202C] rounded-xl text-xs text-white transition-all cursor-pointer active:scale-95 font-semibold"
          >
            Copy Code
          </button>
        </div>

        {/* Passphrase row */}
        {passphrase && (
          <div className="bg-[#131720] border border-[#1A202C] rounded-2xl p-3 flex items-center justify-between mb-4">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] text-[#7E8B9B] block font-mono font-bold">PASSPHRASE</span>
              <span className="text-xs font-mono text-white tracking-wide truncate block mt-0.5">
                {showPass ? passphrase : '•'.repeat(Math.min(passphrase.length, 12))}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPass(s => !s)}
                className="p-1.5 text-[#7E8B9B] hover:text-white transition-colors cursor-pointer"
                title={showPass ? 'Hide passphrase' : 'Show passphrase'}
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleCopyPassphrase}
                className="px-3 py-1.5 bg-[#0D0F14] hover:border-[#00FFFF] border border-[#1A202C] rounded-xl text-xs text-white transition-all cursor-pointer active:scale-95 font-semibold"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Copy link button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3 bg-[#00FFFF] hover:bg-[#33FFFF] text-black font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-md shadow-cyan-950/40 active:scale-95"
        >
          {includePass ? 'Copy Auto-Join Link (w/ Key)' : 'Copy Room Link'}
        </button>

        <p className="text-center text-[11px] text-[#7E8B9B] font-mono mt-3">
          {includePass ? '🔒 Key in hash is client-side only' : 'Other devices need this passphrase to join'}
        </p>
      </div>
    </div>
  );
}

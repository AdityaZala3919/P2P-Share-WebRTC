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
  
  if (!open || !roomId) return null;

  const cleanUrl = `${window.location.origin}/room/${roomId}`;
  const autoJoinUrl = passphrase ? `${cleanUrl}#${encodeURIComponent(passphrase)}` : cleanUrl;
  const targetUrl = includePass ? autoJoinUrl : cleanUrl;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    showToast(`Room code copied: ${roomId}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    showToast(includePass ? '1-Click auto-join link copied!' : 'Direct room link copied!');
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0F14] border border-[#1A202C] rounded-2xl max-w-sm w-full p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Pair Another Device</h3>
            <p className="text-xs text-[#7E8B9B] mt-0.5 font-mono">
              Scan QR or share connection link
            </p>
          </div>
          <button onClick={onClose} className="text-[#7E8B9B] hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-xl shadow-inner">
            <QRCodeSVG value={targetUrl} size={168} />
          </div>
        </div>

        {/* Toggle 1-click auto-join */}
        {passphrase && (
          <div className="flex items-center justify-between bg-[#131720] border border-[#1A202C] rounded-xl px-3 py-2 mb-3">
            <div className="text-left">
              <span className="text-xs text-slate-200 block font-medium">1-Click Auto Join</span>
              <span className="text-[10px] text-[#7E8B9B] block font-mono">Includes passphrase in URL hash</span>
            </div>
            <input
              type="checkbox"
              checked={includePass}
              onChange={e => setIncludePass(e.target.checked)}
              className="accent-[#00FFFF] h-4 w-4 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Room code row */}
        <div className="bg-[#131720] border border-[#1A202C] rounded-xl p-3 flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] text-[#7E8B9B] block font-mono">ROOM CODE</span>
            <span className="text-sm font-mono font-bold text-[#00FFFF] tracking-widest">{roomId}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-2.5 py-1 bg-[#0D0F14] hover:border-[#00FFFF] border border-[#1A202C] rounded text-xs text-white transition-colors"
          >
            Copy Code
          </button>
        </div>

        {/* Copy link button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-2.5 bg-[#00FFFF] hover:bg-[#33FFFF] text-black font-semibold text-xs rounded-xl transition-all"
        >
          {includePass ? 'Copy Auto-Join Link (w/ Key)' : 'Copy Room Link'}
        </button>

        <p className="text-center text-[10px] text-[#7E8B9B] font-mono mt-3">
          {includePass ? '🔒 Key in hash fragment is never sent to servers' : 'Other devices will enter passphrase to join'}
        </p>
      </div>
    </div>
  );
}

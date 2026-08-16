import { useRef } from 'react';
import { showToast } from './Toast';

interface Props {
  onFile: (file: File) => void;
  onClose: () => void;
}

export function AttachMenu({ onFile, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => onFile(f));
    onClose();
  };

  const handleCamera = async () => {
    onClose();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      canvas.toBlob(blob => {
        if (blob) {
          onFile(new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' }));
          showToast('Photo captured and sent');
        }
      }, 'image/jpeg', 0.92);
    } catch {
      showToast('Camera access denied or unavailable');
    }
  };

  const handleScreen = async () => {
    onClose();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      canvas.toBlob(blob => {
        if (blob) {
          onFile(new File([blob], `screen_${Date.now()}.png`, { type: 'image/png' }));
          showToast('Screenshot sent');
        }
      }, 'image/png');
    } catch {
      /* user cancelled */
    }
  };

  const items = [
    { label: 'Document / File', desc: 'Any file type (PDF, ZIP, code, etc.)', icon: '📄', action: () => fileRef.current?.click() },
    { label: 'Folder (Auto-Zip)', desc: 'Recursively packages into a ZIP', icon: '📦', action: () => folderRef.current?.click() },
    { label: 'Photos & Videos', desc: 'Images & high-res video files', icon: '🖼️', action: () => mediaRef.current?.click() },
    { label: 'Camera Snap', desc: 'Take live photo with camera', icon: '📷', action: handleCamera },
    { label: 'Screen Snippet', desc: 'Capture screen / window', icon: '🖥️', action: handleScreen },
  ];

  return (
    <>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={folderRef} type="file" className="hidden" {...{ webkitdirectory: '' }} onChange={e => handleFiles(e.target.files)} />
      <input ref={mediaRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40" onClick={onClose} />

      {/* Adaptive Container: Bottom sheet on mobile, popover card on desktop */}
      <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-full sm:left-4 sm:right-auto sm:mb-2 bg-[#0D0F14] sm:bg-[#131720] border-t sm:border border-[#1A202C] rounded-t-2xl sm:rounded-2xl p-4 sm:p-2.5 shadow-2xl z-50 sm:w-64 max-h-[80vh] overflow-y-auto">
        {/* Mobile drag handle indicator */}
        <div className="w-10 h-1 rounded-full bg-[#1A202C] mx-auto mb-3 sm:hidden" />
        
        <div className="text-[11px] font-mono font-bold text-[#7E8B9B] uppercase tracking-wider px-2.5 pb-2 mb-1 border-b border-[#1A202C]/60 sm:hidden">
          Send Content
        </div>

        <div className="space-y-1">
          {items.map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center space-x-3 px-3 py-3 sm:py-2 rounded-xl hover:bg-[#131720] sm:hover:bg-[#0D0F14] text-slate-200 hover:text-white transition-all text-left cursor-pointer active:scale-[0.98]"
            >
              <span className="text-xl sm:text-base flex-shrink-0">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-xs font-semibold block text-white">{item.label}</span>
                <span className="text-[10px] text-[#7E8B9B] font-mono block truncate">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2.5 bg-[#131720] hover:bg-[#181D28] text-slate-300 font-semibold text-xs rounded-xl transition-all sm:hidden cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

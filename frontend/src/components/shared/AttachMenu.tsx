import { useRef } from 'react';

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      canvas.toBlob(blob => { if (blob) onFile(new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
    } catch { alert('Camera access denied'); }
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
      canvas.toBlob(blob => { if (blob) onFile(new File([blob], `screenshot_${Date.now()}.png`, { type: 'image/png' })); }, 'image/png');
    } catch { /* user cancelled */ }
  };

  const items = [
    { label: 'Document / File', icon: '📄', action: () => fileRef.current?.click() },
    { label: 'Folder (Auto-Zip)', icon: '📁', action: () => folderRef.current?.click() },
    { label: 'Photos & Videos', icon: '🖼️', action: () => mediaRef.current?.click() },
    { label: 'Camera Snap', icon: '📷', action: handleCamera },
    { label: 'Screen Snippet', icon: '🖥️', action: handleScreen },
  ];

  return (
    <>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={folderRef} type="file" className="hidden" {...{ webkitdirectory: '' }} onChange={e => handleFiles(e.target.files)} />
      <input ref={mediaRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
      
      <div className="absolute bottom-full left-0 mb-2 bg-[#131720] border border-[#1A202C] rounded-xl p-2 shadow-2xl w-52 z-20">
        {items.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-[#0D0F14] text-slate-200 hover:text-white transition-colors text-xs text-left"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

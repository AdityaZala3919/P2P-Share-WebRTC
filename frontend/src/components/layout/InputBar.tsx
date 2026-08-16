import { useState } from 'react';
import { AttachMenu } from '../shared/AttachMenu';
import { showToast } from '../shared/Toast';
import { playChime } from '../../lib/audio';

interface Props {
  onSendText: (text: string) => void;
  onSendFile: (file: File) => void;
}

export function InputBar({ onSendText, onSendFile }: Props) {
  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendText(text.trim());
    setText('');
    playChime();
  };

  const handleClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        onSendText(`📋 ${t}`);
        showToast('Clipboard sent to room');
        playChime();
      }
    } catch {
      showToast('Clipboard access denied');
    }
  };

  return (
    <div className="p-3 sm:p-4 border-t border-[#1A202C] bg-[#0D0F14]/90 flex-shrink-0 relative">
      {attachOpen && (
        <AttachMenu
          onFile={(f) => { onSendFile(f); setAttachOpen(false); }}
          onClose={() => setAttachOpen(false)}
        />
      )}
      <form onSubmit={handleSend} className="flex items-center space-x-2 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => setAttachOpen(o => !o)}
          className="p-2.5 rounded-xl bg-[#131720] hover:bg-[#181D28] border border-[#1A202C] text-[#7E8B9B] hover:text-[#00FFFF] transition-colors flex-shrink-0"
          title="Attach file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleClipboard}
          className="p-2.5 rounded-xl bg-[#131720] hover:bg-[#181D28] border border-[#1A202C] text-[#7E8B9B] hover:text-[#00FFFF] transition-colors flex-shrink-0"
          title="Send clipboard"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#131720] border border-[#1A202C] focus:border-[#00FFFF] text-white text-sm rounded-xl px-4 py-2.5 outline-none transition-colors"
        />

        <button
          type="submit"
          className="p-2.5 rounded-xl bg-[#00FFFF] hover:bg-[#33FFFF] text-black font-semibold transition-all flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}

import { showToast } from '../shared/Toast';

interface Props {
  content: string;
  fromDeviceName: string;
  isLocal: boolean;
  timestamp: number;
  type?: 'text' | 'clipboard';
}

export function TextBubble({ content, fromDeviceName, isLocal, timestamp, type = 'text' }: Props) {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isClip = type === 'clipboard' || content.startsWith('📋 ');
  const displayText = isClip ? content.replace(/^📋 /, '') : content;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(displayText);
    showToast('Copied to clipboard');
  };

  return (
    <div className={`flex items-start space-x-2.5 w-full ${isLocal ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}>
      {!isLocal && (
        <div className="w-8 h-8 rounded-full bg-[#131720] border border-[#1A202C] flex items-center justify-center text-[#00FF88] flex-shrink-0 mt-5 text-sm font-mono shadow-xs">
          <span>●</span>
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isLocal ? 'items-end' : 'items-start'}`}>
        <span className={`text-xs font-semibold mb-1 px-1 font-mono ${isLocal ? 'text-[#00FFFF]' : 'text-[#7E8B9B]'}`}>
          {fromDeviceName} {isLocal && '(You)'}
        </span>

        <div
          onClick={handleCopy}
          className={`relative group px-4 py-3 rounded-2xl text-[15px] sm:text-base leading-relaxed shadow-sm cursor-pointer transition-all active:scale-[0.99] ${
            isLocal
              ? 'bg-[#00FFFF]/15 border border-[#00FFFF]/40 text-white rounded-tr-xs hover:border-[#00FFFF]/70'
              : isClip
              ? 'bg-[#131720] border border-[#00FFFF]/40 text-slate-100 rounded-tl-xs hover:border-[#00FFFF]/70 shadow-[0_0_15px_rgba(0,255,255,0.08)]'
              : 'bg-[#131720] border border-[#1A202C] text-slate-100 rounded-tl-xs hover:border-slate-600'
          }`}
        >
          {isClip && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A202C] text-xs text-[#00FFFF] font-mono font-bold">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                CLIPBOARD SYNC
              </span>
              <span className="text-[11px] text-[#7E8B9B] hover:text-white font-normal">Tap to copy</span>
            </div>
          )}

          <p className={`break-words whitespace-pre-wrap ${isClip ? 'font-mono text-sm text-slate-200 break-all bg-[#08090C]/80 p-2.5 rounded-xl border border-[#1A202C]' : ''}`}>
            {displayText}
          </p>

          <div className="flex items-center justify-end space-x-1.5 mt-1.5 pt-0.5">
            <span className="text-xs text-[#7E8B9B] font-mono">{time}</span>
            {isLocal && <span className="text-xs text-[#00FFFF] font-bold">✓✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

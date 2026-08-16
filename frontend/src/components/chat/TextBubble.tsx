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

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    showToast('Copied to clipboard');
  };

  return (
    <div className={`flex items-start space-x-2.5 max-w-xl ${isLocal ? 'ml-auto flex-row-reverse space-x-reverse' : ''}`}>
      {!isLocal && (
        <div className="w-7 h-7 rounded-full bg-[#131720] border border-[#1A202C] flex items-center justify-center text-[#00FF88] flex-shrink-0 mt-5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
        <span className={`text-[11px] font-medium mb-1 mx-1 ${isLocal ? 'text-[#00FFFF]' : 'text-[#7E8B9B]'}`}>
          {fromDeviceName}
        </span>
        <div className={`relative group px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed max-w-sm ${
          isLocal
            ? 'bg-[#00FFFF]/10 border border-[#00FFFF]/40 text-white rounded-tr-sm'
            : isClip
            ? 'bg-[#131720] border border-[#00FFFF]/30 rounded-tl-sm'
            : 'bg-[#131720] border border-[#1A202C] text-slate-100 rounded-tl-sm'
        }`}>
          {isClip && (
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1A202C] text-[11px] text-[#00FFFF] font-mono">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                CLIPBOARD
              </span>
              <button onClick={handleCopy} className="hover:underline">Copy</button>
            </div>
          )}
          <p className={`break-words ${isClip ? 'font-mono text-slate-200 text-xs break-all' : ''}`}>
            {displayText}
          </p>
          <span className="block text-[10px] text-[#7E8B9B] font-mono text-right mt-1">{time}</span>
          {/* Copy on hover for regular messages */}
          {!isClip && (
            <button
              onClick={handleCopy}
              className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0D0F14] border border-[#1A202C] px-1.5 py-0.5 rounded text-[10px] text-[#7E8B9B] hover:text-[#00FFFF]"
            >
              copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

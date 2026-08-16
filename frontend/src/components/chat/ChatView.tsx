import { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { TextBubble } from './TextBubble';
import { TransferBubble } from './TransferBubble';

export function ChatView() {
  const { messages } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 overscroll-contain">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center select-none px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#131720] border border-[#1A202C] flex items-center justify-center text-2xl sm:text-3xl mb-3 shadow-lg shadow-cyan-950/20 animate-pulse">
            ⚡
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Encrypted Room Ready</h3>
          <p className="text-xs text-[#7E8B9B] font-mono max-w-xs leading-relaxed">
            Scan the QR code or share the room link to connect your phone, PC, or tablet.
          </p>
        </div>
      )}

      {/* Date badge */}
      {messages.length > 0 && (
        <div className="flex items-center justify-center my-1">
          <span className="px-2.5 py-0.5 rounded-full bg-[#0D0F14]/80 border border-[#1A202C] text-[10px] font-mono text-[#7E8B9B]">
            Today · End-to-End Encrypted
          </span>
        </div>
      )}

      {messages.map((msg) => {
        if (msg.type === 'system') {
          return (
            <div key={msg.id} className="flex items-center justify-center my-1">
              <span className="px-3 py-1 rounded-full bg-[#131720]/80 border border-[#1A202C] text-[10px] sm:text-[11px] font-mono text-[#7E8B9B] text-center max-w-[90%]">
                {msg.content}
              </span>
            </div>
          );
        }

        if (msg.type === 'transfer') {
          return (
            <TransferBubble
              key={msg.id}
              transferId={msg.transferId!}
              fromDeviceName={msg.fromDeviceName}
              isLocal={msg.isLocal}
              timestamp={msg.timestamp}
            />
          );
        }

        return (
          <TextBubble
            key={msg.id}
            content={msg.content}
            fromDeviceName={msg.fromDeviceName}
            isLocal={msg.isLocal}
            timestamp={msg.timestamp}
            type={msg.type as 'text' | 'clipboard'}
          />
        );
      })}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}

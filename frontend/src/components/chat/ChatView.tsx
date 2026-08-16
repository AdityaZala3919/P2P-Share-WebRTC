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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-[#131720] border border-[#1A202C] flex items-center justify-center text-3xl mb-4">
            ⚡
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">P2P Room Ready</h3>
          <p className="text-xs text-[#7E8B9B] font-mono max-w-xs leading-relaxed">
            Waiting for peers to join. Share the QR code or room code to connect your devices.
          </p>
        </div>
      )}

      {/* Date separator */}
      {messages.length > 0 && (
        <div className="flex items-center justify-center">
          <span className="px-3 py-0.5 rounded-full bg-[#0D0F14] border border-[#1A202C] text-[11px] font-mono text-[#7E8B9B]">
            Today
          </span>
        </div>
      )}

      {messages.map((msg) => {
        if (msg.type === 'system') {
          return (
            <div key={msg.id} className="flex items-center justify-center">
              <span className="px-3 py-0.5 rounded-full bg-[#0D0F14] border border-[#1A202C] text-[11px] font-mono text-[#7E8B9B]">
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

      <div ref={bottomRef} />
    </div>
  );
}

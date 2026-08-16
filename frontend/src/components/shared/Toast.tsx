import { useEffect, useState } from 'react';

let toastFn: (msg: string) => void = () => {};
export const showToast = (msg: string) => toastFn(msg);

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    toastFn = (m) => {
      setMsg(m);
      setVisible(true);
      setTimeout(() => setVisible(false), 2500);
    };
  }, []);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
      visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
    }`}>
      <div className="bg-[#131720] border border-[#00FFFF]/50 px-4 py-2.5 rounded-full text-xs font-mono text-white flex items-center space-x-2 shadow-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] flex-shrink-0"></span>
        <span>{msg}</span>
      </div>
    </div>
  );
}

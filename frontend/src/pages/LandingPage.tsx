import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showToast } from '../components/shared/Toast';

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinParam = searchParams.get('join');

  const [mode, setMode] = useState<'create' | 'join'>(joinParam ? 'join' : 'create');
  const [passphrase, setPassphrase] = useState('');
  const [roomCode, setRoomCode] = useState(joinParam ? joinParam.toUpperCase() : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (joinParam) {
      setMode('join');
      setRoomCode(joinParam.toUpperCase());
    }
  }, [joinParam]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      sessionStorage.setItem(`nexus_pass_${data.room_id}`, passphrase);
      navigate(`/room/${data.room_id}`);
    } catch {
      showToast('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code || !passphrase.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (res.status === 401) throw new Error('Invalid passphrase');
      if (res.status === 404) throw new Error('Room not found');
      if (!res.ok) throw new Error('Error joining room');
      sessionStorage.setItem(`nexus_pass_${code}`, passphrase);
      navigate(`/room/${code}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#08090C]">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center text-[#00FFFF] mx-auto mb-4 shadow-lg">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">NEXUS_P2P</h1>
          <p className="text-xs text-[#7E8B9B] mt-1 font-mono">
            End-to-end encrypted · WebRTC direct transfer
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#131720] border border-[#1A202C] rounded-2xl p-6 shadow-xl">
          {/* Tab switcher */}
          <div className="flex bg-[#0D0F14] rounded-xl p-1 mb-5">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'create' ? 'bg-[#00FFFF] text-black font-semibold' : 'text-[#7E8B9B] hover:text-white'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'join' ? 'bg-[#00FFFF] text-black font-semibold' : 'text-[#7E8B9B] hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-3">
            {mode === 'join' && (
              <div>
                <label className="text-[11px] text-[#7E8B9B] font-mono block mb-1">ROOM CODE</label>
                <input
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD34"
                  className="w-full bg-[#0D0F14] border border-[#1A202C] focus:border-[#00FFFF] text-white text-sm font-mono rounded-xl px-4 py-2.5 outline-none transition-colors tracking-widest uppercase"
                  maxLength={12}
                />
              </div>
            )}
            <div>
              <label className="text-[11px] text-[#7E8B9B] font-mono block mb-1">PASSPHRASE</label>
              <input
                type="password"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                placeholder="Enter room passphrase..."
                className="w-full bg-[#0D0F14] border border-[#1A202C] focus:border-[#00FFFF] text-white text-sm rounded-xl px-4 py-2.5 outline-none transition-colors"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00FFFF] hover:bg-[#33FFFF] disabled:opacity-50 text-black font-semibold text-sm rounded-xl transition-all mt-1 cursor-pointer"
            >
              {loading
                ? 'Connecting...'
                : mode === 'create'
                ? 'Create Encrypted Room'
                : 'Join Room'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#7E8B9B] font-mono mt-4">
          Passphrase never leaves your device · AES-256-GCM Vault
        </p>
      </div>
    </div>
  );
}

interface Props {
  percent: number;
  className?: string;
}
export function ProgressBar({ percent, className = '' }: Props) {
  return (
    <div className={`w-full bg-[#0D0F14] h-1.5 rounded-full overflow-hidden ${className}`}>
      <div
        className="bg-[#00FFFF] h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

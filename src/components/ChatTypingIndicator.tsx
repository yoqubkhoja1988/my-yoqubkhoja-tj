'use client';

type Props = {
  label: string;
  align?: 'start' | 'end';
};

export default function ChatTypingIndicator({ label, align = 'start' }: Props) {
  return (
    <div
      className={`flex max-w-[85%] items-center gap-2 rounded-xl bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-muted)] ${
        align === 'end' ? 'ml-auto' : ''
      }`}
      aria-live="polite"
    >
      <span>{label}</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
      </span>
    </div>
  );
}

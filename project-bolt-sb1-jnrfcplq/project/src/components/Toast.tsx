interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  return (
    <div
      className={`fixed right-6 bottom-6 bg-[#0f1f1a] text-white px-4 py-3.5 rounded-xl text-[13px] font-bold z-[60] transition-all duration-250 ${
        message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5 pointer-events-none'
      }`}
    >
      {message}
    </div>
  );
}

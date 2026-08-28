"use client";

export function Splash() {
  return (
    <div className="bg-festive min-h-[100dvh] flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-16 w-16 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 text-4xl">
          🙏
        </div>
      </div>
      <div className="text-center">
        <p className="text-xl font-semibold tracking-wide">Ganesh Mandal</p>
        <p className="text-sm text-white/80">Management &amp; Accounting</p>
      </div>
      <div className="mt-2 h-1.5 w-32 rounded-full bg-white/25 overflow-hidden">
        <div className="h-full w-1/3 bg-white rounded-full animate-[slide_1.2s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

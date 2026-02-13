"use client";

export default function ChatHome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {/* Pixel art chat icon */}
      <div className="grid grid-cols-7 gap-0.5">
        {[
          0,1,1,1,1,1,0,
          1,0,0,0,0,0,1,
          1,0,1,0,1,0,1,
          1,0,0,0,0,0,1,
          1,0,1,1,1,0,1,
          0,1,1,1,1,1,0,
          0,0,0,0,1,0,0,
        ].map((on, i) => (
          <div
            key={i}
            className={`h-2 w-2 ${on ? "bg-kick opacity-40" : "bg-transparent"}`}
          />
        ))}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Bir sohbet seç veya yeni sohbet başlat</p>
        <p className="mt-2 font-[family-name:var(--font-pixel)] text-[10px] text-muted-foreground">
          Sol menüden kullanıcı arayabilirsin
        </p>
      </div>
    </div>
  );
}

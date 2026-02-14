"use client";

export default function DedikodPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center px-4">
      {/* Pixel art warning icon */}
      <div className="grid grid-cols-7 gap-0.5">
        {[
          0,0,0,1,0,0,0,
          0,0,1,1,1,0,0,
          0,1,1,0,1,1,0,
          0,1,0,1,0,1,0,
          1,1,0,1,0,1,1,
          1,0,0,0,0,0,1,
          1,1,0,1,0,1,1,
          0,1,1,1,1,1,0,
        ].map((on, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 ${on ? "bg-kick opacity-40" : "bg-transparent"}`}
          />
        ))}
      </div>
      <div>
        <h1 className="font-[family-name:var(--font-pixel)] text-sm text-kick">
          DEDİKODU
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm">
          Kick dünyasından dedikodular ve haberler burada olacak. Yakında!
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 bg-kick"
                style={{ animation: `pixel-blink 1s step-end ${i * 0.3}s infinite` }}
              />
            ))}
          </div>
          <span className="font-[family-name:var(--font-pixel)] text-[9px] text-muted-foreground">
            YAKINDA
          </span>
        </div>
      </div>
    </div>
  );
}

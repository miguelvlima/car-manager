"use client";

import { useState } from "react";

export function PhotoThumb({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block shrink-0 overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className ?? "h-12 w-16 object-cover"} />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
        </div>
      ) : null}
    </>
  );
}

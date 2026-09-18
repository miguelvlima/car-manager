"use client";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8">
      <h2 className="text-xl font-semibold">Algo correu mal</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
        Tentar novamente
      </button>
    </div>
  );
}

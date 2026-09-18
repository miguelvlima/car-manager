import { LoginForm } from "./login-form";
import { BrandLockup } from "@/components/brand/brand-lockup";

export default function LoginPage() {
  return (
    <main className="grid h-full min-h-0 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-[#0b1f33] p-12 text-[#f3eee4] lg:flex lg:flex-col lg:justify-between">
        <BrandLockup />
        <div>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight">Stock, localização e história de cada viatura.</h1>
          <p className="mt-6 max-w-md text-lg text-white/70">
            Do dia em que entra até à entrega ao cliente — com permissões certas para cada perfil.
          </p>
        </div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/70">Concessionário de viaturas usadas · Portugal</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
          <BrandLockup tone="light" compact />
          <h2 className="mt-4 text-2xl font-semibold">Iniciar sessão</h2>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">Entre com a sua conta de colaborador.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

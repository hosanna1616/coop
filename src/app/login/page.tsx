import { LoginForm } from "./LoginForm";
import { LoginHeroPanel } from "./LoginHeroPanel";

export const metadata = {
  title: "Sign in | Merchant Nation Command",
  description: "Sign in to Merchant Nation Command",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8 md:flex-row md:gap-12 md:px-8">
      {/* Watermarked background */}
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage: "url('/images/Cooperative_Bank_of_Oromia.png')",
          backgroundSize: "45%",
          backgroundPosition: "center 25%",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-10 md:flex-row md:items-center md:justify-center md:gap-16">
        {/* Description & motto panel */}
        <LoginHeroPanel />

        {/* Login form column */}
        <div className="flex w-full max-w-md flex-col gap-8 md:shrink-0">
          <header className="text-center md:text-left">
            <div className="mb-3 inline-block w-10 border-t-2 border-primary md:mb-4" aria-hidden />
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              Merchant Nation Command
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your account to continue
            </p>
          </header>

          <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-muted-foreground md:text-left">
            Field operations · Branch management · Admin
          </p>
        </div>
      </div>
    </div>
  );
}

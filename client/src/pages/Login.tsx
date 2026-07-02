import { getLoginUrl } from "@/const";
import { LogIn, Layers, Printer } from "lucide-react";

export default function Login() {
  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden">

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-primary/4 blur-[100px]" />
        <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] rounded-full bg-amber-500/3 blur-[100px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 py-12 max-w-md w-full mx-4">

        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-110" />
          <img
            src="/manus-storage/kenny_logo_7f01af60.png"
            alt="Kenny Print It?"
            className="relative w-32 h-32 rounded-full object-cover ring-2 ring-border/50 shadow-2xl"
          />
        </div>

        {/* Title block */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Kenny Print It?
          </h1>
          <p className="text-lg text-primary font-medium tracking-wide">
            3D Printing &amp; Designs
          </p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mt-1">
            Welcome to my library — a curated collection of 3D print models I've gathered for hobby builds, cosplay, toys, gadgets, and mods. Browse, explore, and download freely.
          </p>
          <p className="text-xs text-amber-400/80 font-medium max-w-xs leading-relaxed mt-2 border border-amber-500/20 rounded-lg px-3 py-2 bg-amber-500/5">
            This site is for my closest friends only and files downloaded should NOT be shared under any circumstances.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: Layers, label: "Organized Collections" },
            { icon: Printer, label: "STL & 3MF Files" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 border border-border/50 text-xs text-muted-foreground"
            >
              <Icon className="w-3 h-3 text-primary" />
              {label}
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <a
          href={getLoginUrl()}
          className="group flex items-center gap-2.5 w-full justify-center px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
        >
          <LogIn className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          Sign in to access Kenny Print It?
        </a>

        <p className="text-xs text-muted-foreground/50 text-center">
          Sign in with your Manus account — supports Google, Apple, and email sign-up.
        </p>
      </div>

      {/* Bottom wordmark */}
      <div className="absolute bottom-6 text-xs text-muted-foreground/30 tracking-widest uppercase">
        Kenny Print It? · 3D Printing &amp; Designs
      </div>
    </div>
  );
}

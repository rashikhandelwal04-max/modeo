"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { Monogram, Wordmark } from "./brand";
import { Icon } from "./ui";
import { cx } from "@/lib/util";

export const NAV = [
  { href: "/home", label: "Home", short: "Home", icon: "home" },
  { href: "/edits", label: "The Edits", short: "Edits", icon: "bookmark" },
  { href: "/studio", label: "Unleash Your Style", short: "Studio", icon: "sparkle" },
  { href: "/wardrobe", label: "My Wardrobe", short: "Wardrobe", icon: "hanger" },
  { href: "/try-on", label: "The Fitting Room", short: "Fitting", icon: "mirror" },
  { href: "/looks", label: "My Collection", short: "Collection", icon: "heart" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { ready, onboarded, photo, status } = useApp();
  const avatar = useImage(photo?.imageId);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (ready && !onboarded) router.replace("/welcome");
  }, [ready, onboarded, router]);
  useEffect(() => setMenu(false), [path]);

  if (!ready) return <div style={{ minHeight: "100dvh", background: "var(--paper)" }} />;
  const on = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="app">
      <header className="masthead">
        <Link href="/home" className="brand" aria-label="MY GALA home">
          <Monogram size={38} />
          <Wordmark />
        </Link>
        <nav className="mast-nav" aria-label="Main">
          {NAV.slice(1).map((n) => <Link key={n.href} href={n.href} className={cx(on(n.href) && "on")}>{n.label}</Link>)}
        </nav>
        <div className="mast-right">
          <span className="tiny muted" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }} title="Integration status">
            {status?.claude ? "AI on" : "Offline stylist"} · {status?.tryOn ? "Try-on live" : "Try-on demo"}
          </span>
          <Link href="/profile" className="mast-av" aria-label="My profile">{avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={15} />}</Link>
          <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Open menu"><i /> Menu</button>
        </div>
      </header>

      {menu && (
        <div className="menu-overlay" role="dialog" aria-modal="true">
          <div className="between">
            <span className="lockup"><Monogram size={40} ink="var(--paper)" paper="var(--ink)" /><Wordmark /></span>
            <button className="icon-btn dark" style={{ borderColor: "#444" }} onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="close" /></button>
          </div>
          <nav>
            {[...NAV, { href: "/profile", label: "My Profile", short: "", icon: "" }].map((n, i) => (
              <Link key={n.href} href={n.href} className={cx(on(n.href) && "on")}><small>{String(i + 1).padStart(2, "0")}</small>{n.label}</Link>
            ))}
          </nav>
          <p className="kicker" style={{ marginTop: "auto", paddingTop: 30 }}>Your style. Your stage.</p>
        </div>
      )}

      {children}

      <nav className="bottomnav" aria-label="Quick">
        {NAV.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className={cx(on(n.href) && "on")}><Icon name={n.icon} size={19} />{n.short}</Link>
        ))}
      </nav>
    </div>
  );
}

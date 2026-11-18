"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { Monogram } from "./brand";
import { Icon } from "./ui";
import { cx } from "@/lib/util";

export const NAV = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/studio", label: "Your Edit", icon: "sparkle" },
  { href: "/wardrobe", label: "Wardrobe", icon: "hanger" },
  { href: "/try-on", label: "Fitting Room", icon: "mirror" },
  { href: "/looks", label: "Collection", icon: "heart" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
    const { ready, photo } = useApp();
  const avatar = useImage(photo?.imageId);
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [path]);
  if (!ready) return <div style={{ minHeight: "100dvh" }} />;
  const on = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="app">
      <header className="masthead">
        <Link href="/home" className="brand" aria-label="MY GALA home"><Monogram size={40} /></Link>
        <nav className="mast-nav" aria-label="Main">
          {NAV.slice(1).map((n) => <Link key={n.href} href={n.href} className={cx(on(n.href) && "on")}>{n.label}</Link>)}
        </nav>
        <div className="mast-right">
          <Link href="/profile" className="mast-av" aria-label="Profile">{avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={14} />}</Link>
          <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Open menu"><i /></button>
        </div>
      </header>

      {menu && (
        <div className="menu-overlay" role="dialog" aria-modal="true">
          <div className="between">
            <Monogram size={40} />
            <button className="icon-btn" style={{ border: 0 }} onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="close" size={20} /></button>
          </div>
          <nav>
            {[...NAV, { href: "/profile", label: "Profile", icon: "" }].map((n) => (
              <Link key={n.href} href={n.href} className={cx(on(n.href) && "on")}>{n.label}</Link>
            ))}
          </nav>
        </div>
      )}

      {children}

      <nav className="bottomnav" aria-label="Quick">
        {NAV.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className={cx(on(n.href) && "on")}><Icon name={n.icon} size={18} />{n.label === "Fitting Room" ? "Fitting" : n.label}</Link>
        ))}
      </nav>
    </div>
  );
}

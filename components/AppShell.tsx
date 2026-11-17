"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { Icon } from "./ui";
import { cx } from "@/lib/util";

export const NAV = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/wardrobe", label: "My Wardrobe", short: "Wardrobe", icon: "hanger" },
  { href: "/studio", label: "Style Studio", short: "Studio", icon: "sparkle" },
  { href: "/try-on", label: "Virtual Try-On", short: "Try-On", icon: "mirror" },
  { href: "/looks", label: "Saved Looks", short: "Looks", icon: "bookmark" },
  { href: "/profile", label: "My Profile", short: "Profile", icon: "user" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { ready, onboarded, photo, status } = useApp();
  const avatar = useImage(photo?.imageId);

  useEffect(() => {
    if (ready && !onboarded) router.replace("/welcome");
  }, [ready, onboarded, router]);

  if (!ready) return <div style={{ minHeight: "100dvh" }} />;

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/home" className="brand">MODEO<small>Personal styling studio</small></Link>
        <nav className="nav">
          {NAV.map((n, i) => (
            <Link key={n.href} href={n.href} className={cx(path.startsWith(n.href) && "on")}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div className="tiny" style={{ display: "grid", gap: 6 }}>
            <span><i className={cx("status-dot", status?.claude && "on")} />{status?.claude ? "AI stylist connected" : "AI stylist: offline rules"}</span>
            <span><i className={cx("status-dot", status?.tryOn && "on")} />{status?.tryOn ? `Try-on: ${status.tryOn === "fashn" ? "FASHN" : "Replicate"}` : "Try-on: demo mode"}</span>
          </div>
          <Link href="/profile" className="me">
            <span className="av">{avatar ? <img src={avatar} alt="" /> : "—"}</span>
            <span className="tiny">{photo ? "Your photo is stored on this device only" : "No personal photo yet"}</span>
          </Link>
        </div>
      </aside>

      <header className="topbar">
        <Link href="/home" className="brand">MODEO</Link>
        <Link href="/profile" className="tiny" style={{ letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb" }}>
          {status?.tryOn ? "Try-on live" : "Demo try-on"}
        </Link>
      </header>

      <main className="main">{children}</main>

      <nav className="bottomnav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={cx(path.startsWith(n.href) && "on")}>
            <Icon name={n.icon} size={19} />
            {n.short ?? n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

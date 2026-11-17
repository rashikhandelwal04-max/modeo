"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/state";

export default function Root() {
  const { ready, onboarded } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(onboarded ? "/home" : "/welcome");
  }, [ready, onboarded, router]);
  return <div style={{ minHeight: "100dvh", background: "var(--ink)" }} />;
}

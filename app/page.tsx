"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => { router.replace("/home"); }, [router]);
  return <div style={{ minHeight: "100dvh", background: "#0b0b0b" }} />;
}

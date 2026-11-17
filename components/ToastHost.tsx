"use client";
import { useApp } from "@/lib/store/state";
import { Toast } from "./ui";
export default function ToastHost() {
  const { toastMsg } = useApp();
  return <Toast msg={toastMsg} />;
}

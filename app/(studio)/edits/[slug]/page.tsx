"use client";
import { use } from "react";
import EditView from "@/components/EditView";

export default function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <EditView key={slug} slug={slug} />;
}

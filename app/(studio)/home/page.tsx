"use client";
import Link from "next/link";
import CampaignPhoto from "@/components/CampaignPhoto";
import { CAMPAIGN } from "@/lib/editorial";

export default function Home() {
  return (
    <main className="home">
      <CampaignPhoto className="home-left" file={CAMPAIGN.left.file} prompt={CAMPAIGN.left.prompt} alt="MY GALA campaign" position="50% 20%" />
      <CampaignPhoto className="home-right" file={CAMPAIGN.right.file} prompt={CAMPAIGN.right.prompt} alt="MY GALA campaign" position="50% 30%" />
      <div className="home-center">
        <span className="wordmark home-word">MY GALA</span>
        <h1 className="home-tag">Your style.<br />Your stage.</h1>
        <Link href="/studio" className="btn light big">Your Edit</Link>
      </div>
      <span className="sticker home-sticker">New<br />season</span>
    </main>
  );
}

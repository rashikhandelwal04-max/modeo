export default function PrivacyNote({ compact }: { compact?: boolean }) {
  return (
    <div className="privacy">
      <div className="eyebrow" style={{ color: "var(--ink)" }}>Your photograph, your rules</div>
      <span>Your photo is personal information. It is stored <b>only in this browser on this device</b> (private IndexedDB storage) — it is not uploaded to a MY GALA account or database.</span>
      {!compact && (
        <>
          <span>It leaves your device only when you press <b>Generate try-on</b>, and then only to the virtual try-on provider for that single request. MY GALA&apos;s server relays it and does not keep a copy.</span>
          <span>It is <b>never used to train models</b> unless you give separate, explicit permission. You can delete it at any time from your profile.</span>
        </>
      )}
    </div>
  );
}

export default function PrivacyNote({ compact }: { compact?: boolean }) {
  return (
    <div className="privacy">
      <span>Your photo stays on this device. It's only sent to the try-on service when you press Generate, and never used for training.</span>
      {!compact && <span>You can delete it any time.</span>}
    </div>
  );
}

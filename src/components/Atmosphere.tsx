export function Atmosphere({ phase }: { phase: number }) {
  void phase;

  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="haze" />
      <div className="celestial sun-disc" />
      <div className="celestial moon-disc" />
      <div className="rays" />
      <div className="particles dust" />
      <div className="particles stars" />
    </div>
  );
}

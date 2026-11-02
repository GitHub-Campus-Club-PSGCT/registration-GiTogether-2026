export default function AmbientBackground({ imageSrc }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-black">
      <img
        src={imageSrc}
        alt=""
        className="h-full w-full scale-105 object-cover opacity-40 grayscale-[30%] animate-kenburns"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-600/70 to-transparent" />
    </div>
  );
}

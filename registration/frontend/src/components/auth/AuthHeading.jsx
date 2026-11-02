export default function AuthHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-8 text-center">
      <p className="mb-3 font-display text-[11px] font-medium uppercase tracking-[0.35em] text-brand-500">{eyebrow}</p>
      <h1 className="font-display text-2xl font-bold uppercase leading-[1.2] tracking-[0.08em] text-white sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-[1.5] text-graphite-300">{description}</p>
    </div>
  );
}

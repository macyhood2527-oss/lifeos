export default function Section({ title, subtitle, children }) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {subtitle ? <p className="text-sm text-stone-600">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
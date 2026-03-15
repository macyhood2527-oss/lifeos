export default function Section({ title, subtitle, children, icon: Icon }) {
  return (
    <section className="space-y-2">
      <div>
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={18} strokeWidth={1.75} className="text-inherit opacity-85" /> : null}
          <h2 className="text-base font-semibold text-stone-900 sm:text-lg">{title}</h2>
        </div>
        {subtitle ? <p className="text-sm leading-relaxed text-stone-600">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

import { NavLink } from "react-router-dom";

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-stone-700">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const updated = "March 2026";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-900">
              🌷 About Me
            </div>
            <h1 className="mt-3 text-xl font-semibold text-stone-900">Hi, I’m Melissa Marcelo</h1>
            <p className="mt-1 text-sm text-stone-600">
              Web developer, builder of LifeOS, and someone trying to stay gently consistent.
            </p>
            <p className="mt-2 text-xs text-stone-500">Last updated: {updated}</p>
          </div>

          <NavLink
            to="/"
            className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-stone-700 hover:bg-white active:scale-[0.98]"
          >
            ← Back
          </NavLink>
        </div>
      </div>

      <div className="grid gap-4">
        <Section title="Why I Created LifeOS">
          <p>
            I built LifeOS because I wanted one place to track my habits, tasks, and reflections
            without feeling pressured. I tried many productivity apps before, but most felt too
            overwhelming for my real daily life.
          </p>
        </Section>

        <Section title="What I Needed">
          <ul className="list-disc pl-5 space-y-1">
            <li>A calm interface that doesn’t feel noisy.</li>
            <li>Simple daily check-ins for habits and tasks.</li>
            <li>A reflection space to track mood and mindset.</li>
            <li>Progress visibility without guilt or pressure.</li>
          </ul>
        </Section>

        <Section title="What LifeOS Means To Me">
          <p>
            So far, this is the app closest to my heart. It reflects how I actually want to grow:
            gently, consistently, and honestly. LifeOS is not about doing everything. It is about
            doing what matters, one small step at a time.
          </p>
        </Section>

        <Section title="From Me To You">
          <p>
            If LifeOS helps you feel less overwhelmed and more grounded, then it already did what
            I hoped it would do.
          </p>
        </Section>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/40 backdrop-blur px-5 py-4 text-xs text-stone-500">
        Built gently with heart by Melissa Marcelo 🌸
      </div>
    </div>
  );
}

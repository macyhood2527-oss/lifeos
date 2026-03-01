import { NavLink } from "react-router-dom";

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-stone-700">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const updated = "March 2026"; // edit any time

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-1 text-xs text-rose-900">
              📜 Terms
            </div>
            <h1 className="mt-3 text-xl font-semibold text-stone-900">
              Terms of Service
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Simple, gentle rules so LifeOS stays safe and useful.
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
        <Section title="Using LifeOS">
          <ul className="list-disc pl-5 space-y-1">
            <li>Use LifeOS for personal productivity and journaling.</li>
            <li>Don’t abuse, disrupt, or attempt to break the service.</li>
          </ul>
        </Section>

        <Section title="Your content">
          <p>
            You own the content you create in LifeOS (tasks, habits, reflections).
            You’re responsible for what you store.
          </p>
        </Section>

        <Section title="Availability">
          <p>
            LifeOS is provided “as is.” We may update features or temporarily take the
            service down for maintenance.
          </p>
        </Section>

        <Section title="Limitations of liability">
          <p>
            We’re not liable for any indirect or incidental damages arising from use of
            the app. Please keep backups of anything important.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            We may suspend access if there’s misuse or security risk. You can stop using
            LifeOS anytime.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms. If changes are significant, we’ll update the “Last
            updated” date at the top.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Email:{" "}
            <span className="font-medium text-stone-800">your-email@example.com</span>
          </p>
        </Section>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/40 backdrop-blur px-5 py-4 text-xs text-stone-500">
        LifeOS is built with calm progress in mind — thank you for using it gently 🌷
      </div>
    </div>
  );
}

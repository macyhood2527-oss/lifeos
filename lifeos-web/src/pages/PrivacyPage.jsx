import { NavLink } from "react-router-dom";

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-stone-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const updated = "March 2026"; // edit any time

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-900">
              🔒 Privacy
            </div>
            <h1 className="mt-3 text-xl font-semibold text-stone-900">
              Privacy Policy
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              LifeOS is designed for calm progress. Your data stays yours.
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

      {/* Content */}
      <div className="grid gap-4">
        <Section title="What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-stone-800">Google sign-in info</span>{" "}
              (name, email, profile image) so you can log in.
            </li>
            <li>
              <span className="font-medium text-stone-800">Your LifeOS content</span>{" "}
              (tasks, habits, reflections) that you choose to save.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <p>
            We use your information only to operate LifeOS features: saving your entries,
            showing your progress, and keeping your account secure.
          </p>
        </Section>

        <Section title="What we don’t do">
          <ul className="list-disc pl-5 space-y-1">
            <li>We don’t sell your data.</li>
            <li>We don’t run ads based on your personal content.</li>
            <li>We don’t share your private entries with other users.</li>
          </ul>
        </Section>

        <Section title="Data storage & security">
          <p>
            Your data is stored in our database tied to your account. We take reasonable
            steps to protect it, but no system can guarantee 100% security.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            LifeOS may use cookies for authentication (to keep you signed in). We do not
            use cookies for advertising.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc pl-5 space-y-1">
            <li>You can log out any time.</li>
            <li>You can request deletion of your account data.</li>
          </ul>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests? Email:{" "}
            <span className="font-medium text-stone-800">your-email@example.com</span>
          </p>
        </Section>
      </div>

      {/* Footer note */}
      <div className="rounded-3xl border border-black/5 bg-white/40 backdrop-blur px-5 py-4 text-xs text-stone-500">
        Tip: If you add new features (push notifications, sharing, payments), update this
        policy to match.
      </div>
    </div>
  );
}

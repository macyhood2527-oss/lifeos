import { NavLink } from "react-router-dom";

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-stone-700">{children}</div>
    </section>
  );
}

export default function FaqsPage() {
  const updated = "March 2026";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-1 text-xs text-sky-900">
              ❓ FAQs
            </div>
            <h1 className="mt-3 text-xl font-semibold text-stone-900">How To Use LifeOS</h1>
            <p className="mt-1 text-sm text-stone-600">
              A simple walkthrough so you know what to expect in each tab.
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
        <Section title="What Should I See In Today?">
          <p>
            The Today tab is your quick dashboard. You should see:
          </p>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>A short daily summary and progress bars.</li>
            <li>Soft Signals (notification controls).</li>
            <li>Habits check-ins for the day.</li>
            <li>Your top tasks and quick add composer.</li>
            <li>Today reflection (collapsed if already logged).</li>
          </ol>
        </Section>

        <Section title="How Do I Add And Use Habits?">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to Habits tab.</li>
            <li>Enter a habit name, choose cadence (daily or weekly), set target.</li>
            <li>Click Add habit.</li>
            <li>Use Check in to increment progress.</li>
            <li>
              Habits are grouped in Check in view:
              Due now (0 progress), In progress (partial), Completed (target reached).
            </li>
          </ol>
        </Section>

        <Section title="How Do I Add And Manage Tasks?">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to Tasks tab and add a task from the composer.</li>
            <li>Use Details to set due date, priority, and notes.</li>
            <li>Use Done or Undo to move task state.</li>
            <li>Use quick filters (Due today, Overdue, No due date) for focus.</li>
          </ol>
        </Section>

        <Section title="How Do Reflections Work?">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open Reflections and pick a date on the calendar.</li>
            <li>Fill mood and prompts (gratitude, highlights, challenges, notes).</li>
            <li>Save to log that specific date.</li>
            <li>Use Recent section to jump between older entries quickly.</li>
          </ol>
        </Section>

        <Section title="How Do I Read Analytics?">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Use week controls to navigate previous and next weeks.</li>
            <li>Use mood range switch (7d or 30d) in Mood trend.</li>
            <li>Missed mood markers only count past days, not future days.</li>
            <li>Weekly insight combines mood, tasks, and habits gently.</li>
            <li>Sparse-data labels appear when logs are too few.</li>
          </ol>
        </Section>

        <Section title="How Do Notifications Work?">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Enable browser permission first.</li>
            <li>Turn on notifications in Soft Signals or Settings.</li>
            <li>Use Test button to verify delivery.</li>
            <li>Quiet hours and timezone are respected when configured.</li>
          </ol>
        </Section>

        <Section title="What Is In Settings?">
          <ul className="list-disc pl-5 space-y-1">
            <li>Profile and timezone preferences.</li>
            <li>Notification preference toggles.</li>
            <li>Data export as JSON.</li>
            <li>Account deletion request flow (manual safety process).</li>
          </ul>
        </Section>

        <Section title="What If Something Looks Wrong?">
          <ul className="list-disc pl-5 space-y-1">
            <li>Try Refresh in Notifications or reload the page.</li>
            <li>If updates don’t appear, restart API/web dev servers.</li>
            <li>If timezone feels off, verify your profile timezone in Settings.</li>
          </ul>
        </Section>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/40 backdrop-blur px-5 py-4 text-xs text-stone-500">
        LifeOS is designed for calm progress. Start small, stay consistent, and keep it gentle 🌷
      </div>
    </div>
  );
}

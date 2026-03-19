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
  const updated = "March 20, 2026";
  const quickLinks = [
    { label: "Today", text: "Your calm daily view with Focus Today" },
    { label: "Habits", text: "Track steady routines" },
    { label: "Tasks", text: "Manage what needs doing" },
    { label: "Reflect", text: "Log mood and notes" },
    { label: "Insights", text: "Review weekly patterns" },
    { label: "Reminders", text: "Manage gentle nudges" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-1 text-xs text-sky-900">
              FAQ
            </div>
            <h1 className="mt-3 text-xl font-semibold text-stone-900">Questions About LifeOS</h1>
            <p className="mt-1 text-sm text-stone-600">
              A simple guide to how LifeOS works, what each area is for, and what to do when something feels off.
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

      <div className="rounded-3xl border border-black/5 bg-white/45 backdrop-blur p-5 shadow-sm">
        <div className="text-sm font-semibold text-stone-900">Quick tour</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <div key={item.label} className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
              <div className="text-sm font-medium text-stone-900">{item.label}</div>
              <div className="mt-1 text-xs text-stone-500">{item.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="What is new in the latest update?">
          <p>
            The latest update adds a new Focus Today flow. You can now choose up to three focus tasks,
            set one anchor habit, and write a short intention for the day from the Today page.
          </p>
          <p className="mt-2">
            You can also pin tasks and habits directly into Focus Today from their cards, so the daily
            plan feels quicker and more natural to build.
          </p>
        </Section>

        <Section title="What is LifeOS for?">
          <p>
            LifeOS is for calm personal organization. It brings together habits, tasks, reflections,
            reminders, and weekly insights in one place without making the experience feel harsh or noisy.
          </p>
        </Section>

        <Section title="What should I use first?">
          <p>
            Start with the Today page. It gives you the clearest picture of what matters right now:
            your tasks, your habits, your reminders, and your reflection space for the day.
          </p>
        </Section>

        <Section title="What should I see in Today?">
          <p>
            The Today page is your daily reset point. You should usually see:
          </p>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>A short summary of the day.</li>
            <li>Your Focus Today plan with selected tasks, one anchor habit, and a gentle intention.</li>
            <li>Gentle reminders that are due now or later today.</li>
            <li>Your habits in a quick check-in format.</li>
            <li>Your top tasks and a quick task composer.</li>
            <li>Your reflection area for the day.</li>
          </ol>
        </Section>

        <Section title="How do habits work?">
          <p>
            Habits are meant to be small repeatable actions. You can create a daily or weekly habit,
            set a target, and check in whenever you make progress. On the Habits page you get the full
            management view. On Today you get a lighter version just for quick check-ins.
          </p>
        </Section>

        <Section title="How do tasks work?">
          <p>
            Tasks are for things that need to get done, whether today or later. You can add a title,
            due date, priority, and notes. The Tasks page is your fuller planning area, while Today only
            shows the top slice of what needs attention.
          </p>
          <p className="mt-2">
            If you want a lighter plan for the day, you can pin a few tasks into Focus Today directly
            from the Today task cards.
          </p>
        </Section>

        <Section title="What is Focus Today?">
          <p>
            Focus Today is a lightweight daily planning layer inside the Today page. It helps you choose
            a few meaningful tasks, one steady habit, and a short intention so the day feels clearer.
          </p>
          <p className="mt-2">
            It is meant to reduce overwhelm, not create another heavy planning system. Your focus picks
            are saved for the day and reset naturally on a new day.
          </p>
        </Section>

        <Section title="How do reflections work?">
          <p>
            Reflections let you log mood, gratitude, highlights, challenges, and notes. You can write
            for today or choose another date from the calendar. Over time, these reflections help make
            the weekly insights feel more personal and more honest.
          </p>
        </Section>

        <Section title="What are reminders vs notifications?">
          <p>
            A reminder is the schedule itself, like reminding you about a habit at 9:00 AM. A notification
            is the actual delivery to your device. Reminders are managed in the Reminders area. Notification
            permissions and device setup live in Settings.
          </p>
        </Section>

        <Section title="How do reminders work?">
          <p>
            You can attach reminders to habits and tasks. They can be active, paused, tested, or marked
            handled for today. The Reminders page gives you the full overview, while Today only shows
            what matters right now.
          </p>
        </Section>

        <Section title="How do weekly insights work?">
          <p>
            Insights combine your mood logs, task completion, and habit consistency into a weekly view.
            They are meant to be warm and honest, not overly dramatic. If you have very little data,
            the app will keep the interpretation lighter and more cautious.
          </p>
        </Section>

        <Section title="What can I change in Settings?">
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name and timezone.</li>
            <li>Theme mood and density preferences.</li>
            <li>Notification preferences and delivery setup.</li>
            <li>Data export and import.</li>
            <li>Reminder management shortcut.</li>
          </ul>
        </Section>

        <Section title="Can I back up my data?">
          <p>
            Yes. In Settings, you can export your LifeOS data as JSON. You can also import a LifeOS JSON
            backup later. Import currently replaces your existing tasks, habits, reflections, and reminders
            with what is in that file.
          </p>
        </Section>

        <Section title="What if something feels slow or wrong?">
          <ul className="list-disc pl-5 space-y-1">
            <li>Reload the page once to rule out a stale client state.</li>
            <li>Check your timezone in Settings if dates feel off.</li>
            <li>If reminders or login fail in local development, make sure both web and API servers are running.</li>
            <li>If the app still feels slow, the bottleneck may be your API or database connection rather than the page UI.</li>
          </ul>
        </Section>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/40 backdrop-blur px-5 py-4 text-xs text-stone-500">
        LifeOS is designed for calm progress. Start small, stay honest, and let the app support your pace.
      </div>
    </div>
  );
}

// The frame for the login, register and accept-invite pages:
// on wide screens, what Taskboard is (with a few example cards) next to the form.
import { CardMark, PriorityTab } from './ui.jsx';

// Example cards, fanned like a hand of cards pulled from the rack.
const SAMPLE_CARDS = [
  { priority: 'HIGH', title: 'Fix the checkout bug before launch', tilt: '-rotate-2', offset: 'ml-0' },
  { priority: 'MEDIUM', title: 'Write the onboarding emails', tilt: 'rotate-1', offset: 'ml-10' },
  { priority: 'LOW', title: 'Tidy up the icon set', tilt: 'rotate-3', offset: 'ml-20' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen px-4 py-10 md:py-20">
      <div className="mx-auto grid max-w-5xl items-start gap-16 md:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="hidden md:block">
          <div className="flex items-center gap-3">
            <CardMark size={40} />
            <span className="font-condensed text-[40px] leading-none font-semibold">Taskboard</span>
          </div>
          <p className="mt-5 max-w-md text-xl leading-relaxed text-ink-soft">
            Plan your team's work on a shared board. Each organization's projects are visible only to its members.
          </p>

          <div className="mt-10 space-y-3" aria-hidden="true">
            {SAMPLE_CARDS.map((card) => (
              <div
                key={card.title}
                className={`w-72 overflow-hidden rounded-[3px] border border-line bg-stock ${card.tilt} ${card.offset}`}
              >
                <PriorityTab priority={card.priority} />
                <p className="px-3 pt-2 pb-3 font-condensed text-[17px] font-semibold">{card.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-sm justify-self-center md:max-w-none">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <CardMark size={32} />
            <span className="font-condensed text-3xl font-semibold">Taskboard</span>
          </div>
          <h1 className="font-condensed text-[32px] leading-tight font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
          <div className="mt-6 rounded border border-ink bg-stock p-6">{children}</div>
          {footer && <div className="mt-5 text-ink-soft">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

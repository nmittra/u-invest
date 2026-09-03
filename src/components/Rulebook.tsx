import { IconAnchor, IconBolt, IconCalendar, IconPulse, IconScale, IconShield, IconTarget } from "./icons";

export function Rulebook({ profileName }: { profileName: string }) {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* opening */}
      <header className="rise">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-fog-500">The house document · {profileName}'s rulebook</div>
        <h1 className="mt-2 font-display font-bold text-[38px] sm:text-[48px] leading-[1.02] tracking-tight text-fog-100">
          Classify while calm.<br />
          <span className="text-fog-500">Obey while not.</span>
        </h1>
        <p className="mt-4 text-[15px] text-fog-300 leading-relaxed max-w-2xl">
          Every position is classified into one of two sleeves <em className="text-fog-100 not-italic font-semibold">at the time of purchase</em> —
          before price moves and emotion enter the picture. The sleeve decides how, or whether, the position gets stopped out.{" "}
          <span className="text-flare-400 font-medium">No position changes sleeves mid-drawdown.</span>
        </p>
      </header>

      {/* the two sleeves — asymmetric */}
      <div className="grid lg:grid-cols-[1fr_1.25fr] gap-5 items-start">
        {/* sleeve 1 */}
        <section className="rise relative rounded-lg border border-flare-600/50 bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.08s" }}>
          <div className="absolute -right-4 -top-10 font-display font-bold text-[150px] leading-none text-flare-400/[0.06] select-none pointer-events-none">01</div>
          <div className="h-[3px] bg-flare-400" />
          <div className="p-6 relative">
            <div className="flex items-center gap-2.5 text-flare-400">
              <IconBolt size={18} />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Sleeve 1</span>
            </div>
            <h2 className="mt-2 font-display font-bold text-[24px] text-fog-100 tracking-tight">Trading Positions</h2>
            <p className="mt-2 text-[13px] text-fog-500 leading-relaxed">
              Names bought on a technical setup — breakout, base, momentum — rather than deep multi-year conviction.
              Including thematic names you're not fully committed to yet.
            </p>
            <ul className="mt-5 space-y-3.5">
              <Rule tick="flare">
                Hard price stop set at entry: <strong className="text-flare-300">7–8% below entry price</strong>, no exceptions.
              </Rule>
              <Rule tick="flare">No averaging down into this stop. If it hits, you're out.</Rule>
              <Rule tick="flare">
                If the stock recovers after you're stopped out — that's an <strong className="text-fog-100">acceptable cost of running this system</strong>,
                not proof the system failed. You're trading small, defined losses on purpose.
              </Rule>
            </ul>
            <div className="mt-6 rounded-md border border-flare-600/40 bg-flare-900/30 px-4 py-3 flex items-center gap-3">
              <IconTarget size={17} className="text-flare-400 shrink-0" />
              <span className="font-mono text-[11.5px] text-flare-300 tracking-wide leading-relaxed">STOP HIT = EXIT, NO DEBATE.</span>
            </div>
          </div>
        </section>

        {/* sleeve 2 */}
        <section className="rise relative rounded-lg border border-moss-600/50 bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.16s" }}>
          <div className="absolute -right-4 -top-10 font-display font-bold text-[150px] leading-none text-moss-400/[0.06] select-none pointer-events-none">02</div>
          <div className="h-[3px] bg-moss-400" />
          <div className="p-6 relative">
            <div className="flex items-center gap-2.5 text-moss-400">
              <IconAnchor size={18} />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Sleeve 2</span>
            </div>
            <h2 className="mt-2 font-display font-bold text-[24px] text-fog-100 tracking-tight">Core Thematic Positions</h2>
            <p className="mt-2 text-[13px] text-fog-500 leading-relaxed">
              Names tied to the 5-year dominant themes — AI infrastructure; critical minerals, copper & silver as AI inputs;
              nuclear/uranium; gold as a hedge — intended to be held through volatility.
            </p>
            <ul className="mt-5 space-y-3.5">
              <Rule tick="moss">
                <strong className="text-moss-300">No price-based stop.</strong> Price alone never triggers a sell here — a market wobble and a
                broken thesis look identical on a chart, and a price stop can't tell them apart.
              </Rule>
              <Rule tick="moss">
                <strong className="text-moss-300">Thesis-invalidation criteria replace the stop.</strong> Written before you buy, in specific falsifiable
                terms — not "it dropped 15%" but a fact you could point to: hyperscaler capex cut two quarters running, key design wins
                lost to a named competitor, a specific substitution shift breaking the commodity thesis.
              </Rule>
              <Rule tick="moss">
                <strong className="text-moss-300">Position size is the real risk control</strong>, since there's no stop. Size it so a 50–70% drawdown
                wouldn't meaningfully damage the account.
              </Rule>
              <Rule tick="moss">
                <strong className="text-moss-300">Add-on plan set in advance</strong>, not decided in the moment: add X% more at −20%, another X% at −35%,
                hard cap at Y% of account. Write the actual numbers now, while calm.
              </Rule>
            </ul>
            <div className="mt-6 rounded-md border border-moss-600/40 bg-moss-900/30 px-4 py-3 flex items-center gap-3">
              <IconShield size={17} className="text-moss-400 shrink-0" />
              <span className="font-mono text-[11.5px] text-moss-300 tracking-wide leading-relaxed">PRICE ALONE NEVER SELLS A CORE. ONLY A NAMED FACT DOES.</span>
            </div>
          </div>
        </section>
      </div>

      {/* entry checklist */}
      <section className="rise rounded-lg border border-line bg-pine-850/80 p-6 sm:p-7" style={{ animationDelay: "0.22s" }}>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-500">Entry checklist</span>
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11px] text-flare-400 tracking-wider">FILL BEFORE YOU BUY · EVERY TIME</span>
        </div>
        <ol className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            "Which sleeve? (1 = Trading / 2 = Core Thematic)",
            "One-line thesis: why this stock, why this theme",
            "Sleeve 1 → exact stop price",
            "Sleeve 2 → thesis-invalidation criteria (specific, checkable facts)",
            "Sleeve 2 → add-on plan (trigger % + size at each step, hard cap)",
            "Position size as % of account",
            "Next scheduled review date",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[13.5px] text-fog-300 leading-snug">
              <span className="flex items-center justify-center w-[19px] h-[19px] rounded-sm border border-pine-600 bg-pine-900 shrink-0 mt-px">
                <span className="w-2 h-2 rounded-[2px] bg-pine-600" />
              </span>
              {item}
            </li>
          ))}
        </ol>
      </section>

      {/* review cadence + gut check */}
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <section className="rise rounded-lg border border-line bg-pine-850/80 p-6" style={{ animationDelay: "0.28s" }}>
          <div className="flex items-center gap-2 text-fog-300">
            <IconCalendar size={17} className="text-flare-400" />
            <h2 className="font-display font-bold text-[17px] text-fog-100">Review cadence</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-md border-l-2 border-flare-400 pl-4">
              <div className="font-mono text-[10.5px] tracking-[0.18em] text-flare-400">SLEEVE 1</div>
              <p className="mt-1 text-[13px] text-fog-300 leading-relaxed">
                Check against the stop whenever you're normally reviewing the account. No stop = no action needed.{" "}
                <strong className="text-fog-100">Stop hit = exit, no debate.</strong>
              </p>
            </div>
            <div className="rounded-md border-l-2 border-moss-400 pl-4">
              <div className="font-mono text-[10.5px] tracking-[0.18em] text-moss-400">SLEEVE 2</div>
              <p className="mt-1 text-[13px] text-fog-300 leading-relaxed">
                Review on a <strong className="text-fog-100">fixed schedule — monthly or quarterly — not on red days.</strong> The question is always:
                "Has anything on my invalidation list actually happened?" Never: "How does this red number feel?"
              </p>
            </div>
          </div>
        </section>

        <section className="rise rounded-lg border border-line bg-pine-850/80 p-6" style={{ animationDelay: "0.34s" }}>
          <div className="flex items-center gap-2 text-fog-300">
            <IconPulse size={17} className="text-flare-400" />
            <h2 className="font-display font-bold text-[17px] text-fog-100">The gut-check</h2>
            <span className="font-mono text-[10px] text-fog-600 tracking-wider ml-auto">IN THE MOMENT</span>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <span className="font-mono text-[12px] text-flare-400 shrink-0 pt-0.5">Q1</span>
              <p className="text-[13px] text-fog-300 leading-relaxed">
                <strong className="text-fog-100">Has the news changed, or just the price?</strong> Price only → Sleeve 2 territory: hold, do nothing.
                A named invalidation fact occurred → exit, regardless of price or how "giving up on it" feels.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-mono text-[12px] text-flare-400 shrink-0 pt-0.5">Q2</span>
              <p className="text-[13px] text-fog-300 leading-relaxed">
                <strong className="text-fog-100">Am I acting because of what the position is doing, or because of what I planned at this trigger?</strong>{" "}
                If it's not on the pre-written plan — don't act today. Sleep on it; revisit at the next scheduled review.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-md bg-pine-900/70 border border-line px-4 py-3 flex items-center gap-3">
            <IconScale size={16} className="text-fog-500 shrink-0" />
            <span className="text-[12px] text-fog-500 leading-relaxed">
              The tool runs this check for you — from the desk, or before any exit you're tempted to make early.
            </span>
          </div>
        </section>
      </div>

      <footer className="rise pb-2" style={{ animationDelay: "0.4s" }}>
        <p className="font-mono text-[10.5px] text-fog-600 tracking-wider leading-relaxed">
          THIS BOOK DOESN'T PICK STOCKS. IT MAKES SURE THE YOU-WHO-WROTE-THE-PLAN IS THE ONE DECIDING — NOT THE YOU-WHO-WATCHED-IT-DROP.
        </p>
      </footer>
    </div>
  );
}

function Rule({ children, tick }: { children: React.ReactNode; tick: "flare" | "moss" }) {
  return (
    <li className="flex items-start gap-3 text-[13.5px] text-fog-300 leading-relaxed">
      <span className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 ${tick === "flare" ? "bg-flare-400" : "bg-moss-400"}`} />
      <span>{children}</span>
    </li>
  );
}

import { useState } from "react";
import { Modal, btnGhost } from "./ui";
import { IconAnchor, IconBolt, IconPulse, IconShield, IconX } from "./icons";

type Stage = "q1" | "q2" | "hold" | "exit" | "execute" | "standdown";

export function GutCheck({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("q1");

  return (
    <Modal tone="flare" kicker="The gut-check · use in the moment, before acting" title="Two questions. Answer honestly." onClose={onClose}>
      {stage === "q1" && (
        <div className="fade-in">
          <Question n={1} text="Has the news — the facts about the company or sector — changed, or just the price?" />
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Answer
              tone="moss"
              icon={<IconShield size={17} />}
              title="Just the price"
              sub="Charts got red. Nothing factual happened."
              onClick={() => setStage("q2")}
            />
            <Answer
              tone="ember"
              icon={<IconBolt size={17} />}
              title="A named invalidation fact occurred"
              sub="Something on the pre-written list actually happened."
              onClick={() => setStage("exit")}
            />
          </div>
        </div>
      )}

      {stage === "q2" && (
        <div className="fade-in">
          <div className="rounded-md border border-moss-600/40 bg-moss-900/30 px-3.5 py-2.5 text-[12.5px] text-moss-300 leading-snug">
            Price-only movement is Sleeve 2 territory. So before anything else — what's actually driving you right now?
          </div>
          <Question n={2} text="Are you acting because of a pre-written trigger, or because of what the position is doing to you?" />
          <div className="mt-4 grid gap-3">
            <Answer
              tone="fog"
              icon={<IconAnchor size={17} />}
              title="Nothing — I'm just checking in"
              sub="No trigger fired. The plan still stands."
              onClick={() => setStage("hold")}
            />
            <Answer
              tone="flare"
              icon={<IconBolt size={17} />}
              title="A pre-written trigger"
              sub="An add-on level, a scheduled review, a stop — all decided while calm."
              onClick={() => setStage("execute")}
            />
            <Answer
              tone="ember"
              icon={<IconPulse size={17} />}
              title="The position's behavior — how it feels"
              sub="The red number is doing the deciding."
              onClick={() => setStage("standdown")}
            />
          </div>
        </div>
      )}

      {stage === "hold" && (
        <Verdict
          stamp="HOLD"
          stampCls="text-moss-400 border-moss-400"
          headline="Do nothing. That is the correct action."
          body={
            <>
              Price moved; facts didn't. A market wobble and a broken thesis look identical on a chart — and you already
              decided, while calm, that price alone never sells a core. Close the app. The next scheduled review will ask
              the right question.
            </>
          }
          onBack={() => setStage("q1")}
          onClose={onClose}
        />
      )}

      {stage === "exit" && (
        <Verdict
          stamp="EXIT"
          stampCls="text-ember-400 border-ember-400"
          headline="Exit — regardless of price, regardless of how it feels."
          body={
            <>
              A named invalidation fact has occurred. That is the entire sell signal for a core position. "Giving up on it"
              is not the issue — the thesis you wrote is no longer true. Log the exit with the fact in the note, so the
              ledger remembers why.
            </>
          }
          onBack={() => setStage("q1")}
          onClose={onClose}
        />
      )}

      {stage === "execute" && (
        <Verdict
          stamp="EXECUTE"
          stampCls="text-flare-400 border-flare-400"
          headline="Execute the plan — calmly, exactly as written."
          body={
            <>
              This trigger was decided by you, while calm, before any drawdown. Execute it at the pre-written size — no
              improvising the amount because conviction feels higher now. If it's a stop: no debate. If it's an add-on:
              respect the hard cap.
            </>
          }
          onBack={() => setStage("q1")}
          onClose={onClose}
        />
      )}

      {stage === "standdown" && (
        <Verdict
          stamp="STAND DOWN"
          stampCls="text-fog-300 border-fog-500"
          headline="Don't act today. Sleep on it."
          body={
            <>
              If it isn't on the pre-written plan, it doesn't get done today — that's the rule that separates the system
              from the noise. Revisit at the next scheduled review, where the only question is whether an invalidation
              fact actually happened.
            </>
          }
          onBack={() => setStage("q1")}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function Question({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3.5 items-start">
      <span className="font-mono text-[13px] text-flare-400 mt-0.5">Q{n}</span>
      <h3 className="font-display font-bold text-[18px] text-fog-100 leading-snug">{text}</h3>
    </div>
  );
}

function Answer({
  tone,
  icon,
  title,
  sub,
  onClick,
}: {
  tone: "moss" | "flare" | "ember" | "fog";
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  const iconCls = tone === "moss" ? "text-moss-400" : tone === "flare" ? "text-flare-400" : tone === "ember" ? "text-ember-400" : "text-fog-500";
  const hoverCls =
    tone === "moss"
      ? "hover:border-moss-600 hover:bg-moss-900/40"
      : tone === "flare"
        ? "hover:border-flare-600 hover:bg-flare-900/40"
        : tone === "ember"
          ? "hover:border-ember-600 hover:bg-ember-900/40"
          : "hover:border-pine-600 hover:bg-pine-800";
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-md border border-line bg-pine-900 p-4 transition-all duration-150 active:scale-[0.985] group ${hoverCls}`}
    >
      <div className={`flex items-center gap-2 ${iconCls}`}>
        {icon}
        <span className="font-display font-bold text-[15px] text-fog-100">{title}</span>
      </div>
      <div className="mt-1.5 text-[12.5px] text-fog-500 leading-snug group-hover:text-fog-300 transition-colors">{sub}</div>
    </button>
  );
}

function Verdict({
  stamp,
  stampCls,
  headline,
  body,
  onBack,
  onClose,
}: {
  stamp: string;
  stampCls: string;
  headline: string;
  body: React.ReactNode;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fade-in text-center">
      <div className={`stamp inline-block border-[3px] rounded-md px-6 py-2.5 font-display font-bold text-[34px] tracking-[0.14em] ${stampCls}`}
        style={{ textShadow: "0 0 30px currentColor" }}
      >
        {stamp}
      </div>
      <h3 className="mt-5 font-display font-bold text-[19px] text-fog-100 leading-snug">{headline}</h3>
      <p className="mt-2.5 text-[13.5px] text-fog-300 leading-relaxed max-w-md mx-auto">{body}</p>
      <div className="mt-6 flex justify-center gap-2.5">
        <button onClick={onBack} className={btnGhost}>
          <IconX size={14} /> Answer again
        </button>
        <button onClick={onClose} className={btnGhost}>Done</button>
      </div>
    </div>
  );
}

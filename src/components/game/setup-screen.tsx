"use client";

import { Button } from "@/components/ui/button";
import type { EngineStrength, GameSettings, OpponentKind, PlayerColor } from "@/lib/chess/types";

function Choice<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; hint: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</legend>
      <div className={`grid gap-2 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active ? "border-primary/70 bg-primary/10" : "border-border bg-card/60 hover:bg-muted/50"
              }`}
            >
              <div className="text-sm font-medium">{option.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{option.hint}</div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SetupScreen({
  settings, onChange, onStart, embedded = false,
}: {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onStart: () => void;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "mx-auto w-full max-w-md px-1 pb-6" : "mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10"}>
      {embedded ? null : (
        <>
          <p className="text-xs font-medium tracking-[0.22em] text-amber-200/70 uppercase">Boardside</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">Learn chess with a coach on the board.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Play a game. The coach watches, marks the important squares, and explains the tradeoffs — without covering the board unless you want the full chat.
          </p>
        </>
      )}
      <div className="mt-8 space-y-5">
        <Choice<PlayerColor>
          label="Your color"
          value={settings.playerColor}
          onChange={(playerColor) => onChange({ ...settings, playerColor })}
          options={[
            { value: "w", title: "White", hint: "You move first" },
            { value: "b", title: "Black", hint: "Coach or bot opens" },
          ]}
        />
        <Choice<OpponentKind>
          label="Opponent"
          value={settings.opponent}
          onChange={(opponent) => onChange({ ...settings, opponent })}
          options={[
            { value: "engine", title: "Bot", hint: "A local engine plays" },
            { value: "coach", title: "Coach", hint: "The AI plays and teaches" },
          ]}
        />
        {settings.opponent === "engine" ? (
          <Choice<EngineStrength>
            label="Bot strength"
            value={settings.strength}
            onChange={(strength) => onChange({ ...settings, strength })}
            options={[
              { value: "easy", title: "Easy", hint: "Friendly" },
              { value: "medium", title: "Club", hint: "Solid club player" },
              { value: "hard", title: "Sharp", hint: "Looks deeper" },
            ]}
          />
        ) : null}
        <label className="flex items-start gap-3 rounded-xl border border-border bg-card/60 px-3 py-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-amber-200"
            checked={settings.autoCoach}
            onChange={(event) => onChange({ ...settings, autoCoach: event.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">Coach after each move</span>
            <span className="block text-xs leading-5 text-muted-foreground">A short note and board marks after you or the opponent move.</span>
          </span>
        </label>
      </div>
      <Button className="mt-8 h-11 w-full text-base" onClick={onStart}>
        {embedded ? "Apply and restart" : "Start game"}
      </Button>
    </div>
  );
}

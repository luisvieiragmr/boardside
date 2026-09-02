"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, SendHorizonal, Sparkles } from "lucide-react";
import type { ChessCoachUIMessage } from "@/lib/agents/chess-coach";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { messageText } from "@/lib/chat/message-utils";
import { cn } from "@/lib/utils";

const PROMPTS = ["Why this move?", "What should I look at?", "Show the tactics", "Compare my options"];

function partLabel(message: ChessCoachUIMessage) {
  const highlights = message.parts.filter((part) => part.type === "tool-highlightBoard");
  const plays = message.parts.filter((part) => part.type === "tool-playOpponentMove");
  const bits: string[] = [];
  if (highlights.length) bits.push("marked the board");
  if (plays.length) bits.push("played a reply");
  return bits.join(" · ");
}

function CoachBubble({ message }: { message: ChessCoachUIMessage }) {
  const text = messageText(message);
  const meta = partLabel(message);
  const mine = message.role === "user";
  if (!text && !meta) return null;
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6", mine ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground")}>
        {meta && !mine ? (
          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium tracking-wide text-amber-200/80 uppercase">
            <Sparkles className="size-3" />
            {meta}
          </p>
        ) : null}
        {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
      </div>
    </div>
  );
}

export function CoachDock({
  messages, expanded, onToggle, input, onInput, onSend, busy, forceExpanded,
}: {
  messages: ChessCoachUIMessage[];
  expanded: boolean;
  onToggle: () => void;
  input: string;
  onInput: (value: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  forceExpanded?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const last = [...messages].reverse().find((message) => message.role === "assistant");
  const lastText = last ? messageText(last) : "";
  const lastMeta = last ? partLabel(last) : "";

  useEffect(() => {
    if (!expanded) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [expanded, messages]);

  const submit = (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
  };

  return (
    <section className={cn(
      "flex min-h-0 flex-col border-t border-border/80 bg-card/80 backdrop-blur-md",
      forceExpanded ? "h-full" : expanded ? "h-[min(52dvh,28rem)]" : "h-auto",
    )}>
      <button type="button" className="flex w-full items-start gap-3 px-4 py-3 text-left" onClick={onToggle} aria-expanded={expanded}>
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-200/15 text-amber-100">
          <Sparkles className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Coach</span>
            {forceExpanded ? null : expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronUp className="size-4 text-muted-foreground" />}
          </span>
          {expanded ? (
            <span className="mt-0.5 text-sm text-foreground">Conversation</span>
          ) : (
            <>
              <span className="mt-0.5 line-clamp-2 text-sm leading-5">
                {busy && !lastText ? "Looking at the position…" : lastText || "Tap to ask about a move, a plan, or a tactic."}
              </span>
              {lastMeta ? <span className="mt-1 block text-[11px] text-amber-200/70">{lastMeta}</span> : null}
            </>
          )}
        </span>
      </button>
      {expanded ? (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
            {messages.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">Ask anything. I’ll mark the board while I talk.</p>
            ) : (
              messages.map((message) => <CoachBubble key={message.id} message={message} />)
            )}
            {busy ? <p className="text-xs text-muted-foreground">Coach is thinking…</p> : null}
          </div>
          <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {PROMPTS.map((prompt) => (
                <button key={prompt} type="button" disabled={busy} onClick={() => submit(prompt)} className="shrink-0 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground disabled:opacity-50">
                  {prompt}
                </button>
              ))}
            </div>
            <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <Textarea
                value={input}
                onChange={(event) => onInput(event.target.value)}
                placeholder="Ask the coach…"
                rows={1}
                className="min-h-10 max-h-28 resize-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send message">
                <SendHorizonal />
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="w-full" onClick={onToggle}>Open chat</Button>
        </div>
      )}
    </section>
  );
}

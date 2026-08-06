"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";

import type { ArduinoEvent } from "@/lib/runtime/arduino-prelude";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Pins the visual board draws an LED for, in the order they appear. */
const DEFAULT_LED_PINS = [13, 12, 11, 10, 9, 8];

interface PinState {
  digital: number;
  pwm: number;
  mode: number;
}

function emptyPins(): Record<number, PinState> {
  const pins: Record<number, PinState> = {};
  for (let i = 0; i < 20; i++) pins[i] = { digital: 0, pwm: 0, mode: 0 };
  return pins;
}

/**
 * Replays a compiled sketch's event timeline.
 *
 * The sketch already ran to completion inside WebAssembly against a virtual
 * clock, so "playing" it is pure presentation: walk the event list in wall-clock
 * time and paint the pin states. That is what makes `delay(1000)` cost nothing
 * and lets the timeline be paused, restarted, or scrubbed.
 */
export function BoardSim({
  events,
  ledPins,
  autoPlay = true,
  onButtonPress,
  buttonPin,
}: {
  events: ArduinoEvent[];
  ledPins?: number[];
  autoPlay?: boolean;
  /** Called with the virtual timestamp at which the press should be injected. */
  onButtonPress?: (atMicros: number) => void;
  buttonPin?: number;
}) {
  const [playing, setPlaying] = useState(autoPlay);
  const [cursor, setCursor] = useState(0);
  const [pins, setPins] = useState<Record<number, PinState>>(emptyPins);
  const [serial, setSerial] = useState<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef<number>(0);

  const duration = useMemo(
    () => (events.length ? events[events.length - 1].t : 0),
    [events],
  );

  const activePins = useMemo(() => {
    if (ledPins) return ledPins;
    const touched = new Set<number>();
    for (const e of events) {
      if ((e.kind === "D" || e.kind === "A" || e.kind === "M") && e.pin != null) {
        if (e.kind === "M" && e.value === 0) continue; // plain INPUT: not an LED
        touched.add(e.pin);
      }
    }
    const found = [...touched].sort((a, b) => b - a);
    return found.length ? found.slice(0, 8) : DEFAULT_LED_PINS.slice(0, 2);
  }, [events, ledPins]);

  // Recompute board state whenever the cursor moves.
  useEffect(() => {
    const next = emptyPins();
    const lines: string[] = [];
    for (const e of events) {
      if (e.t > cursor) break;
      if (e.kind === "D" && e.pin != null) next[e.pin].digital = e.value ?? 0;
      if (e.kind === "A" && e.pin != null) next[e.pin].pwm = e.value ?? 0;
      if (e.kind === "M" && e.pin != null) next[e.pin].mode = e.value ?? 0;
      if (e.kind === "S") lines.push(e.text ?? "");
    }
    setPins(next);
    setSerial(lines);
  }, [cursor, events]);

  // Drive the cursor in real time while playing.
  useEffect(() => {
    if (!playing || duration === 0) return;

    startedRef.current = performance.now() - cursor / 1000;

    const tick = () => {
      const elapsedMs = performance.now() - startedRef.current;
      const next = elapsedMs * 1000;
      if (next >= duration) {
        setCursor(duration);
        setPlaying(false);
        return;
      }
      setCursor(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // `cursor` is intentionally excluded: including it would restart the
    // animation on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  // A fresh compile resets the playhead.
  useEffect(() => {
    setCursor(0);
    setPlaying(autoPlay);
  }, [events, autoPlay]);

  const seconds = (cursor / 1_000_000).toFixed(2);
  const total = (duration / 1_000_000).toFixed(2);

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => {
            if (cursor >= duration) setCursor(0);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <PauseIcon className="size-3.5" />
          ) : (
            <PlayIcon className="size-3.5" />
          )}
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => {
            setCursor(0);
            setPlaying(true);
          }}
          aria-label="Restart"
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>

        <input
          type="range"
          min={0}
          max={duration || 1}
          value={cursor}
          onChange={(e) => {
            setPlaying(false);
            setCursor(Number(e.target.value));
          }}
          className="accent-primary h-1 min-w-24 flex-1"
          aria-label="Timeline position"
        />

        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {seconds}s / {total}s
        </span>

        {buttonPin != null && onButtonPress && (
          <Button
            size="sm"
            variant="secondary"
            onMouseDown={() => onButtonPress(Math.round(cursor))}
          >
            Press button
          </Button>
        )}
      </div>

      {/* The board */}
      <div className="flex flex-wrap items-center gap-4 rounded-md bg-[#0f766e]/10 p-4">
        {activePins.map((pin) => {
          const state = pins[pin] ?? { digital: 0, pwm: 0, mode: 0 };
          const brightness = state.pwm > 0 ? state.pwm / 255 : state.digital;
          return (
            <div key={pin} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "size-7 rounded-full border-2 transition-[opacity,box-shadow] duration-75",
                  brightness > 0
                    ? "border-red-400 bg-red-500"
                    : "border-muted-foreground/30 bg-muted-foreground/10",
                )}
                style={
                  brightness > 0
                    ? {
                        opacity: 0.35 + brightness * 0.65,
                        boxShadow: `0 0 ${8 + brightness * 14}px rgba(239,68,68,${brightness * 0.9})`,
                      }
                    : undefined
                }
                aria-label={`Pin ${pin} ${brightness > 0 ? "on" : "off"}`}
              />
              <span className="text-muted-foreground font-mono text-[10px]">
                {pin === 13 ? "13 (L)" : pin}
              </span>
            </div>
          );
        })}
        {activePins.length === 0 && (
          <p className="text-muted-foreground text-xs">
            This sketch never drives an output pin.
          </p>
        )}
      </div>

      {/* Serial monitor */}
      <div>
        <div className="text-muted-foreground mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide uppercase">
          <span>Serial Monitor</span>
          <span className="font-mono normal-case">9600 baud</span>
        </div>
        <div className="scrollbar-thin h-28 overflow-y-auto rounded-md border bg-[#12161c] p-2 font-mono text-[12px] leading-5 text-emerald-300">
          {serial.length === 0 ? (
            <span className="text-muted-foreground/70">
              Nothing printed yet.
            </span>
          ) : (
            serial.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

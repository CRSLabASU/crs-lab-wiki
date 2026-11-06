"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Battery robots: idle (unplugged), charging, overdue (charged too long).
// Docked robots: docked (on the charger, where they belong), in-use (off the
// charger), plug-back (off the charger too long).
export type ChargeState =
  | "idle"
  | "charging"
  | "overdue"
  | "docked"
  | "in-use"
  | "plug-back";

/** States where the robot is physically plugged in. */
export const PLUGGED: ChargeState[] = ["charging", "overdue", "docked"];
/** States that need someone to act. */
export const ALERT: ChargeState[] = ["overdue", "plug-back"];

type SceneProps = {
  states: Record<string, ChargeState>;
  selected: string | null;
  onSelect: (id: string) => void;
};

// Where each robot sits in the 1000×600 scene, where its badge floats, and
// where its cable ends (the power strip on the wall or a floor outlet).
const NAO_X = {
  "nao-jimmy": 300,
  "nao-yoda": 400,
  "nao-bran": 500,
  "nao-echo": 600,
};
const NAO_ACCENT = {
  "nao-jimmy": "#3b82f6",
  "nao-yoda": "#22c55e",
  "nao-bran": "#a855f7",
  "nao-echo": "#ec4899",
};
const DESK_TOP = 300;

const CABLES: Record<string, { from: [number, number]; to: [number, number] }> =
  {
    "nao-jimmy": { from: [300, 245], to: [330, 262] },
    "nao-yoda": { from: [400, 245], to: [420, 262] },
    "nao-bran": { from: [500, 245], to: [510, 262] },
    "nao-echo": { from: [600, 245], to: [600, 262] },
    movo: { from: [170, 520], to: [218, 372] },
    husky: { from: [640, 510], to: [700, 372] },
    ur5: { from: [840, 450], to: [930, 372] },
  };

const BADGES: Record<string, [number, number]> = {
  "nao-jimmy": [300, 165],
  "nao-yoda": [400, 165],
  "nao-bran": [500, 165],
  "nao-echo": [600, 165],
  movo: [120, 240],
  husky: [520, 440],
  ur5: [915, 140],
};

export function LabScene({ states, selected, onSelect }: SceneProps) {
  return (
    <svg
      viewBox="0 110 1000 490"
      className="h-auto w-full select-none"
      role="group"
      aria-label="Lab bench: four NAOs on the desk, the Kinova MOVO and Husky in front, and the UR5 beside the desk"
    >
      <style>{`
        @keyframes charge-flow { to { stroke-dashoffset: -24; } }
        .charge-flow { animation: charge-flow 0.8s linear infinite; }
        @keyframes badge-pulse { from { opacity: .55; transform: scale(1); } to { opacity: 0; transform: scale(1.6); } }
        .badge-pulse { animation: badge-pulse 1.6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .charge-flow, .badge-pulse { animation: none; }
        }
      `}</style>

      {/* Room */}
      <rect width="1000" height="372" className="fill-muted/50" />
      <rect y="372" width="1000" height="228" className="fill-muted" />
      <line
        x1="0"
        y1="372"
        x2="1000"
        y2="372"
        className="stroke-border"
        strokeWidth="3"
      />

      {/* Wall power strip behind the desk, and floor outlets */}
      <rect
        x="300"
        y="256"
        width="320"
        height="16"
        rx="4"
        className="fill-card stroke-border"
        strokeWidth="2"
      />
      {[330, 420, 510, 600].map((x) => (
        <rect
          key={x}
          x={x - 7}
          y="260"
          width="14"
          height="8"
          rx="2"
          className="fill-muted-foreground/40"
        />
      ))}
      {[218, 700, 930].map((x) => (
        <g key={x}>
          <rect
            x={x - 14}
            y="340"
            width="28"
            height="32"
            rx="4"
            className="fill-card stroke-border"
            strokeWidth="2"
          />
          <circle cx={x} cy="356" r="5" className="fill-muted-foreground/40" />
        </g>
      ))}

      {/* Desk */}
      <rect
        x="250"
        y={DESK_TOP + 18}
        width="14"
        height="160"
        className="fill-muted-foreground/30"
      />
      <rect
        x="636"
        y={DESK_TOP + 18}
        width="14"
        height="160"
        className="fill-muted-foreground/30"
      />
      <path
        d={`M240 ${DESK_TOP} L660 ${DESK_TOP} L668 ${DESK_TOP + 8} L232 ${DESK_TOP + 8} Z`}
        className="fill-card"
      />
      <rect
        x="232"
        y={DESK_TOP + 8}
        width="436"
        height="14"
        rx="2"
        className="fill-muted-foreground/25"
      />

      {/* Cables (drawn first so robots sit on top) */}
      {Object.entries(CABLES).map(([id, { from, to }]) => {
        const state = states[id];
        if (!PLUGGED.includes(state)) return null;
        const [x1, y1] = from;
        const [x2, y2] = to;
        const midY = Math.max(y1, y2) + 30;
        const d = `M${x1} ${y1} C${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        return (
          <g key={id} className="pointer-events-none">
            <path
              d={d}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-foreground/50"
            />
            {/* Current only flows visibly while a battery is charging. */}
            {state !== "docked" && (
              <path
                d={d}
                fill="none"
                strokeWidth="3"
                strokeDasharray="4 8"
                strokeLinecap="round"
                className={cn(
                  "charge-flow",
                  state === "overdue" ? "stroke-red-500" : "stroke-primary",
                )}
              />
            )}
          </g>
        );
      })}

      {/* NAOs on the desk */}
      {(Object.keys(NAO_X) as (keyof typeof NAO_X)[]).map((id) => (
        <RobotHit
          key={id}
          id={id}
          label={id.replace("nao-", "NAO ")}
          selected={selected}
          onSelect={onSelect}
          halo={[NAO_X[id], DESK_TOP + 2, 34, 6]}
        >
          <Nao cx={NAO_X[id]} base={DESK_TOP} accent={NAO_ACCENT[id]} />
        </RobotHit>
      ))}

      {/* UR5 on its pedestal beside the desk */}
      <RobotHit
        id="ur5"
        label="UR5"
        selected={selected}
        onSelect={onSelect}
        halo={[820, 482, 70, 10]}
      >
        <Ur5 />
      </RobotHit>

      {/* Front row: MOVO and Husky on the floor */}
      <RobotHit
        id="movo"
        label="Kinova MOVO"
        selected={selected}
        onSelect={onSelect}
        halo={[120, 572, 90, 12]}
      >
        <Movo cx={120} base={568} />
      </RobotHit>
      <RobotHit
        id="husky"
        label="Husky"
        selected={selected}
        onSelect={onSelect}
        halo={[520, 572, 150, 12]}
      >
        <Husky cx={520} base={566} />
      </RobotHit>

      {/* Status badges float above everything */}
      {Object.entries(BADGES).map(([id, [x, y]]) => (
        <Badge key={id} x={x} y={y} state={states[id]} />
      ))}
    </svg>
  );
}

function RobotHit({
  id,
  label,
  selected,
  onSelect,
  halo,
  children,
}: {
  id: string;
  label: string;
  selected: string | null;
  onSelect: (id: string) => void;
  halo: [number, number, number, number];
  children: ReactNode;
}) {
  const isSelected = selected === id;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(id)}
      onKeyDown={onKeyDown}
      className="group cursor-pointer outline-none"
    >
      <ellipse
        cx={halo[0]}
        cy={halo[1]}
        rx={halo[2]}
        ry={halo[3]}
        className={cn(
          "transition-colors",
          isSelected
            ? "fill-primary/50"
            : "fill-foreground/10 group-hover:fill-primary/25 group-focus-visible:fill-primary/40",
        )}
      />
      <g className="transition-transform duration-200 group-hover:-translate-y-1">
        {children}
      </g>
    </g>
  );
}

const BADGE_FILL: Record<ChargeState, string> = {
  idle: "fill-muted-foreground/60",
  charging: "fill-primary",
  overdue: "fill-red-500",
  docked: "fill-green-600",
  "in-use": "fill-amber-500",
  "plug-back": "fill-red-500",
};

function Badge({ x, y, state }: { x: number; y: number; state: ChargeState }) {
  const color = BADGE_FILL[state];
  const alert = ALERT.includes(state);
  return (
    <g className="pointer-events-none">
      {(alert || state === "charging") && (
        <circle cx={x} cy={y} r="20" className={cn("badge-pulse", color)} />
      )}
      <circle
        cx={x}
        cy={y}
        r="16"
        className={cn(color, "stroke-card")}
        strokeWidth="3"
      />
      {alert ? (
        <path
          d={`M${x} ${y - 8} v9 M${x} ${y + 6} v0.5`}
          className="stroke-white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : state === "in-use" ? (
        // Plug with its prongs pulled out.
        <path
          d={`M${x - 4} ${y - 9} v5 M${x + 4} ${y - 9} v5 M${x - 7} ${y - 4} h14 v4 a7 7 0 0 1 -14 0 Z M${x} ${y + 7} v4`}
          className="fill-white stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d={`M${x + 2} ${y - 10} L${x - 6} ${y + 2} L${x} ${y + 2} L${x - 2} ${y + 10} L${x + 6} ${y - 2} L${x} ${y - 2} Z`}
          className={state === "idle" ? "fill-card" : "fill-white"}
        />
      )}
    </g>
  );
}

/* ── Robot drawings ─────────────────────────────────────────── */

function Nao({
  cx,
  base,
  accent,
}: {
  cx: number;
  base: number;
  accent: string;
}) {
  const shell = "#f1f2f4";
  const line = "#9aa1ab";
  return (
    <g strokeWidth="1.5" stroke={line}>
      {/* legs and feet */}
      <rect
        x={cx - 15}
        y={base - 44}
        width="12"
        height="40"
        rx="5"
        fill={shell}
      />
      <rect
        x={cx + 3}
        y={base - 44}
        width="12"
        height="40"
        rx="5"
        fill={shell}
      />
      <rect
        x={cx - 19}
        y={base - 8}
        width="17"
        height="8"
        rx="3"
        fill={accent}
      />
      <rect
        x={cx + 2}
        y={base - 8}
        width="17"
        height="8"
        rx="3"
        fill={accent}
      />
      {/* arms */}
      <rect
        x={cx - 33}
        y={base - 88}
        width="11"
        height="40"
        rx="5"
        fill={shell}
      />
      <rect
        x={cx + 22}
        y={base - 88}
        width="11"
        height="40"
        rx="5"
        fill={shell}
      />
      {/* torso */}
      <rect
        x={cx - 22}
        y={base - 92}
        width="44"
        height="50"
        rx="10"
        fill={shell}
      />
      <circle cx={cx} cy={base - 70} r="7" fill={accent} stroke="none" />
      {/* head */}
      <rect
        x={cx - 19}
        y={base - 124}
        width="38"
        height="32"
        rx="14"
        fill={shell}
      />
      <rect
        x={cx - 13}
        y={base - 116}
        width="26"
        height="14"
        rx="7"
        fill="#2a2f3a"
        stroke="none"
      />
      <circle cx={cx - 6} cy={base - 109} r="3" fill={accent} stroke="none" />
      <circle cx={cx + 6} cy={base - 109} r="3" fill={accent} stroke="none" />
      <rect
        x={cx - 22}
        y={base - 114}
        width="5"
        height="12"
        rx="2"
        fill={accent}
        stroke="none"
      />
      <rect
        x={cx + 17}
        y={base - 114}
        width="5"
        height="12"
        rx="2"
        fill={accent}
        stroke="none"
      />
    </g>
  );
}

function Husky({ cx, base }: { cx: number; base: number }) {
  return (
    <g>
      {/* chassis */}
      <rect
        x={cx - 128}
        y={base - 80}
        width="256"
        height="48"
        rx="8"
        fill="#f2b705"
        stroke="#8a6a00"
        strokeWidth="2"
      />
      <rect
        x={cx - 120}
        y={base - 92}
        width="240"
        height="14"
        rx="3"
        fill="#1f2328"
      />
      {/* top rails */}
      <rect
        x={cx - 90}
        y={base - 100}
        width="180"
        height="8"
        rx="2"
        fill="#3a3f47"
      />
      {/* bumpers */}
      <rect
        x={cx - 140}
        y={base - 60}
        width="14"
        height="22"
        rx="3"
        fill="#1f2328"
      />
      <rect
        x={cx + 126}
        y={base - 60}
        width="14"
        height="22"
        rx="3"
        fill="#1f2328"
      />
      <text
        x={cx}
        y={base - 50}
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#1f2328"
        letterSpacing="3"
      >
        HUSKY
      </text>
      {/* wheels */}
      {[-82, 82].map((dx) => (
        <g key={dx}>
          <circle cx={cx + dx} cy={base - 26} r="28" fill="#15181c" />
          <circle cx={cx + dx} cy={base - 26} r="11" fill="#5b6270" />
          <circle cx={cx + dx} cy={base - 26} r="4" fill="#15181c" />
        </g>
      ))}
    </g>
  );
}

function Movo({ cx, base }: { cx: number; base: number }) {
  const dark = "#2b2f36";
  const ring = "#8b929c";
  const arm = (side: 1 | -1) => {
    const sx = cx + side * 44;
    const pts: [number, number][] = [
      [sx, base - 232],
      [sx + side * 26, base - 196],
      [sx + side * 22, base - 150],
      [sx + side * 6, base - 122],
    ];
    return (
      <g key={side}>
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={dark}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="8"
            fill={dark}
            stroke={ring}
            strokeWidth="3"
          />
        ))}
        {/* three-finger hand */}
        <path
          d={`M${pts[3][0] - 7} ${pts[3][1] + 6} l-3 14 M${pts[3][0]} ${pts[3][1] + 8} l0 15 M${pts[3][0] + 7} ${pts[3][1] + 6} l3 14`}
          stroke={dark}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    );
  };
  return (
    <g>
      {/* mobile base */}
      <rect
        x={cx - 70}
        y={base - 62}
        width="140"
        height="52"
        rx="12"
        fill={dark}
      />
      <rect
        x={cx - 60}
        y={base - 52}
        width="120"
        height="10"
        rx="3"
        fill="#454b55"
      />
      <circle cx={cx - 48} cy={base - 8} r="10" fill="#15181c" />
      <circle cx={cx + 48} cy={base - 8} r="10" fill="#15181c" />
      {/* linear actuator column */}
      <rect
        x={cx - 14}
        y={base - 230}
        width="28"
        height="170"
        rx="4"
        fill="#c9ced6"
        stroke="#8b929c"
        strokeWidth="2"
      />
      {/* shoulders */}
      <rect
        x={cx - 52}
        y={base - 246}
        width="104"
        height="28"
        rx="8"
        fill={dark}
      />
      {arm(-1)}
      {arm(1)}
      {/* neck and Kinect-style head */}
      <rect x={cx - 4} y={base - 262} width="8" height="18" fill={dark} />
      <rect
        x={cx - 32}
        y={base - 282}
        width="64"
        height="22"
        rx="6"
        fill={dark}
      />
      <circle cx={cx - 14} cy={base - 271} r="5" fill="#4aa3df" />
      <circle cx={cx + 14} cy={base - 271} r="5" fill="#4aa3df" />
    </g>
  );
}

function Ur5() {
  const link = "#c9ced6";
  const cap = "#2f6fd0";
  const edge = "#7d8590";
  return (
    <g>
      {/* pedestal */}
      <rect x="770" y="340" width="100" height="138" rx="4" fill="#3a3f47" />
      <rect x="760" y="332" width="120" height="12" rx="3" fill="#4b515b" />
      {/* base */}
      <rect
        x="796"
        y="300"
        width="48"
        height="32"
        rx="6"
        fill={link}
        stroke={edge}
        strokeWidth="2"
      />
      <rect x="796" y="300" width="48" height="8" rx="3" fill={cap} />
      {/* upper arm, forearm */}
      <line
        x1="820"
        y1="282"
        x2="880"
        y2="170"
        stroke={link}
        strokeWidth="26"
        strokeLinecap="round"
      />
      <line
        x1="880"
        y1="170"
        x2="950"
        y2="210"
        stroke={link}
        strokeWidth="20"
        strokeLinecap="round"
      />
      <line
        x1="950"
        y1="210"
        x2="950"
        y2="250"
        stroke={link}
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* joints with blue caps */}
      {[
        [820, 282, 20],
        [880, 170, 17],
        [950, 210, 13],
        [950, 250, 11],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle
            cx={x}
            cy={y}
            r={r}
            fill={link}
            stroke={edge}
            strokeWidth="2"
          />
          <circle cx={x} cy={y} r={r * 0.55} fill={cap} />
        </g>
      ))}
      {/* Robotiq gripper */}
      <rect x="938" y="262" width="24" height="14" rx="3" fill="#2b2f36" />
      <rect x="936" y="276" width="7" height="20" rx="2" fill="#2b2f36" />
      <rect x="957" y="276" width="7" height="20" rx="2" fill="#2b2f36" />
    </g>
  );
}

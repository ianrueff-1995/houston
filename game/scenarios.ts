// Scenarios and speeds for the panel at the top of the page.
// `startWith` is how many satellites are already up; `decay` makes every
// satellite's mood change faster (2 = twice as fast).

export type ScenarioId = "calm" | "busy" | "storm" | "empty";

export type Scenario = {
  id: ScenarioId;
  label: string;
  hint: string;
  startWith: number;
  decay: number;
};

export const SCENARIOS: Scenario[] = [
  { id: "calm", label: "Calm", hint: "A few satellites, nothing urgent.", startWith: 3, decay: 1 },
  { id: "busy", label: "Busy Tuesday", hint: "A crowded sky.", startWith: 12, decay: 1 },
  { id: "storm", label: "Solar storm", hint: "Everything decays 2× faster.", startWith: 6, decay: 2 },
  { id: "empty", label: "Empty sky", hint: "Nothing up there yet.", startWith: 0, decay: 1 },
];

export const SPEEDS = [0.5, 1, 2];

export const getScenario = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

export const TUTOR_SLASH_COMMANDS = ["teach", "quiz", "case", "explain", "summarize"] as const;

export type TutorSlashCommand = (typeof TUTOR_SLASH_COMMANDS)[number];

export type ParsedSlashCommand = {
  argument: string;
  command: TutorSlashCommand | null;
  strippedQuestion: string;
};

const COMMAND_PATTERN = /^\/(teach|quiz|case|explain|summarize)\b(?:\s+(.*))?$/i;

export function parseSlashCommand(input: string): ParsedSlashCommand {
  const trimmed = input.trim();
  const match = trimmed.match(COMMAND_PATTERN);
  if (!match) {
    return { argument: "", command: null, strippedQuestion: trimmed };
  }
  const command = match[1].toLowerCase() as TutorSlashCommand;
  const argument = (match[2] ?? "").trim();
  const strippedQuestion = argument || trimmed.replace(COMMAND_PATTERN, "").trim() || trimmed;
  return { argument, command, strippedQuestion };
}

export function isTutorSlashCommand(command: TutorSlashCommand | null): command is TutorSlashCommand {
  return command !== null;
}

/** Map free-text tutor topic requests to curriculum step (1-based). */
export function resolveTutorStepFromText(text: string, labels: readonly string[]): number | null {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const aliases: Record<string, string[]> = {
    "Cardiac Anatomy": ["anatomy", "cardiac anatomy", "heart anatomy"],
    "Electrical Conduction": ["conduction", "electrical conduction", "sa node", "av node"],
    "ECG Paper": ["ecg paper", "paper", "grid", "calibration paper"],
    Leads: ["leads", "lead placement", "limb leads", "precordial"],
    Waves: ["waves", "p wave", "qrs", "t wave", "st segment"],
    Intervals: ["intervals", "pr interval", "qt interval", "qtc"],
    Axis: ["axis", "frontal axis"],
    Hypertrophy: ["hypertrophy", "lvh", "rvh", "ventricular hypertrophy"],
    "Bundle Branch Block": ["bundle branch", "bbb", "lbbb", "rbbb", "bundle branch block"],
    Arrhythmias: ["arrhythmia", "arrhythmias", "af", "atrial fibrillation", "vt", "svt"],
    STEMI: ["stemi", "st elevation", "st-elevation mi"],
    NSTEMI: ["nstemi", "non-st elevation", "non st elevation"],
    "Clinical Interpretation": ["clinical interpretation", "interpretation", "systematic", "read ecg"],
  };

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const labelLower = label.toLowerCase();
    if (normalized.includes(labelLower)) return index + 1;
    const topicAliases = aliases[label] ?? [];
    if (topicAliases.some((alias) => normalized.includes(alias))) return index + 1;
  }
  return null;
}

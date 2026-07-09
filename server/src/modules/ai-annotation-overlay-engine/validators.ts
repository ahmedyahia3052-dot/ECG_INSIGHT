import type { AiOverlayWorkspaceDto } from "../ai-overlay/ai-overlay.contracts";
import type { AiOverlayLayerConfigDto } from "./dto";
import { AI_OVERLAY_LAYER_ORDER } from "./types";

export type ValidationResult = { errors: string[]; valid: boolean };

export function validateOverlayWorkspace(workspace: AiOverlayWorkspaceDto): ValidationResult {
  const errors: string[] = [];
  if (workspace.version !== 1) errors.push("Unsupported workspace version.");
  if (!Array.isArray(workspace.annotations)) errors.push("Annotations must be an array.");
  return { errors, valid: errors.length === 0 };
}

export function validateLayerConfig(layerConfig: AiOverlayLayerConfigDto): ValidationResult {
  const keys = new Set(layerConfig.layers.map((layer) => layer.key));
  const errors = AI_OVERLAY_LAYER_ORDER.filter((key) => !keys.has(key)).map((key) => `Missing layer toggle: ${key}`);
  return { errors, valid: errors.length === 0 };
}

export function validatePhysicianNote(note: string): ValidationResult {
  const trimmed = note.trim();
  if (!trimmed) return { errors: ["Physician note cannot be empty."], valid: false };
  return { errors: [], valid: true };
}

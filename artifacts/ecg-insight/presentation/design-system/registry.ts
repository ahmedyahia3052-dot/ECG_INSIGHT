/**
 * Sprint 78 — Design system registry (tokens, themes, components, mappings).
 */

import { COMPONENT_REGISTRY_VERSION, componentRegistry, validateBoltMappings } from "./component-registry";
import { BOLT_MAPPING_VERSION, BOLT_TO_ECG_COMPONENT_MAP } from "./bolt-mapping";
import { PRESENTATION_TOKEN_VERSION } from "../tokens";
import { themeRegistry } from "@/design-system/themes/registry";
import { medicalComponentRegistry } from "../components/medical/registry";

export type DesignSystemRegistry = {
  boltMappingVersion: string;
  componentRegistryVersion: string;
  medicalRegistryVersion: string;
  themes: typeof themeRegistry;
  tokenVersion: string;
  boltMappings: typeof BOLT_TO_ECG_COMPONENT_MAP;
  components: typeof componentRegistry;
  medicalComponents: typeof medicalComponentRegistry;
};

export const designSystemRegistry: DesignSystemRegistry = {
  boltMappingVersion: BOLT_MAPPING_VERSION,
  boltMappings: BOLT_TO_ECG_COMPONENT_MAP,
  componentRegistryVersion: COMPONENT_REGISTRY_VERSION,
  components: componentRegistry,
  medicalComponents: medicalComponentRegistry,
  medicalRegistryVersion: medicalComponentRegistry.version,
  themes: themeRegistry,
  tokenVersion: PRESENTATION_TOKEN_VERSION,
};

export function assertDesignSystemRegistry() {
  const mappingErrors = validateBoltMappings();
  if (mappingErrors.length) {
    throw new Error(`Design system registry invalid: ${mappingErrors.join("; ")}`);
  }
  if (!themeRegistry.light || !themeRegistry.dark) {
    throw new Error("Design system registry missing light/dark themes.");
  }
  return true;
}

export const DESIGN_SYSTEM_REGISTRY_VERSION = "sprint78-v1";

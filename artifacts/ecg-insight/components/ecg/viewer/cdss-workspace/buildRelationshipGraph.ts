import type { CdssRecommendation, CdssRelationshipGraph, CdssRuleEvaluation } from "./types";

export function buildRelationshipGraph(
  matched: CdssRuleEvaluation[],
  recommendations: CdssRecommendation[],
): CdssRelationshipGraph {
  const nodes: CdssRelationshipGraph["nodes"] = [];
  const edges: CdssRelationshipGraph["edges"] = [];

  for (const rule of matched) {
    const diagnosisId = `dx-${rule.ruleId}`;
    nodes.push({ id: diagnosisId, kind: "diagnosis", label: rule.diagnosis });

    for (const measurement of rule.evidence.measurements) {
      const measurementId = `meas-${rule.ruleId}-${measurement.slice(0, 24).replace(/\s+/g, "-")}`;
      if (!nodes.some((n) => n.id === measurementId)) {
        nodes.push({ id: measurementId, kind: "measurement", label: measurement });
      }
      edges.push({ from: measurementId, label: "supports", to: diagnosisId });
    }

    for (const morphology of rule.evidence.morphology) {
      const findingId = `find-${rule.ruleId}-${morphology.slice(0, 24).replace(/\s+/g, "-")}`;
      if (!nodes.some((n) => n.id === findingId)) {
        nodes.push({ id: findingId, kind: "finding", label: morphology });
      }
      edges.push({ from: findingId, label: "evidence", to: diagnosisId });
    }

    for (const lead of rule.evidence.affectedLeads) {
      const leadId = `lead-${rule.ruleId}-${lead}`;
      if (!nodes.some((n) => n.id === leadId)) {
        nodes.push({ id: leadId, kind: "finding", label: `Lead ${lead}` });
      }
      edges.push({ from: leadId, label: "affected", to: diagnosisId });
    }
  }

  for (const rec of recommendations) {
    const recId = `rec-${rec.action.slice(0, 32).replace(/\s+/g, "-")}`;
    if (!nodes.some((n) => n.id === recId)) {
      nodes.push({ id: recId, kind: "recommendation", label: rec.action });
    }
    for (const dx of rec.linkedDiagnoses) {
      const target = matched.find((m) => m.diagnosis === dx);
      if (target) {
        edges.push({ from: `dx-${target.ruleId}`, label: "recommends", to: recId });
      }
    }
  }

  return { edges, nodes };
}

export function summarizeRelationshipGraph(graph: CdssRelationshipGraph) {
  const measurements = graph.nodes.filter((n) => n.kind === "measurement").length;
  const findings = graph.nodes.filter((n) => n.kind === "finding").length;
  const diagnoses = graph.nodes.filter((n) => n.kind === "diagnosis").length;
  const recommendations = graph.nodes.filter((n) => n.kind === "recommendation").length;
  return `${measurements} measurement node(s), ${findings} finding node(s), ${diagnoses} diagnosis node(s), ${recommendations} recommendation node(s), ${graph.edges.length} relationship edge(s).`;
}

import type { EnterpriseReportType, ReportTemplateCategory } from "@prisma/client";
import type { EnterpriseReportTemplateDefinition, ReportSectionKey } from "./types";

const BASE_SECTIONS: ReportSectionKey[] = ["header", "patient", "ecg", "ai", "doctor", "attachments", "disclaimer"];

export const ENTERPRISE_REPORT_TEMPLATES: EnterpriseReportTemplateDefinition[] = [
  {
    slug: "hospital-standard",
    name: "Hospital Standard ECG Report",
    category: "HOSPITAL",
    reportType: "HOSPITAL",
    description: "Full hospital ECG report with branding, AI findings, and physician signature.",
    sections: BASE_SECTIONS,
    branding: { primaryColor: "#0F766E", secondaryColor: "#134E4A", watermark: "Hospital ECG Report" },
  },
  {
    slug: "clinic-routine",
    name: "Clinic Routine ECG Report",
    category: "CLINIC",
    reportType: "PROFESSIONAL_ECG",
    description: "Outpatient clinic ECG with concise interpretation.",
    sections: ["header", "patient", "ecg", "doctor", "attachments", "disclaimer"],
    branding: { primaryColor: "#1D4ED8", secondaryColor: "#1E3A8A" },
  },
  {
    slug: "emergency-triage",
    name: "Emergency ECG Report",
    category: "EMERGENCY",
    reportType: "EMERGENCY",
    description: "Emergency department ECG with urgency and critical findings.",
    sections: ["header", "patient", "ecg", "ai", "doctor", "attachments", "disclaimer"],
    branding: { primaryColor: "#B91C1C", secondaryColor: "#7F1D1D", watermark: "EMERGENCY" },
  },
  {
    slug: "occupational-medicine",
    name: "Occupational ECG Report",
    category: "OCCUPATIONAL_MEDICINE",
    reportType: "OCCUPATIONAL_ECG",
    description: "Occupational health ECG with fitness decision and restrictions.",
    sections: [...BASE_SECTIONS, "occupational"],
    branding: { primaryColor: "#047857", secondaryColor: "#065F46" },
  },
  {
    slug: "sports-medicine",
    name: "Sports Medicine ECG Report",
    category: "SPORTS_MEDICINE",
    reportType: "MEDICAL_FITNESS",
    description: "Athletic screening ECG with fitness clearance.",
    sections: [...BASE_SECTIONS, "fitness"],
    branding: { primaryColor: "#7C3AED", secondaryColor: "#5B21B6" },
  },
  {
    slug: "insurance-clearance",
    name: "Insurance ECG Report",
    category: "INSURANCE",
    reportType: "PROFESSIONAL_ECG",
    description: "Insurance provider ECG summary with verification QR.",
    sections: ["header", "patient", "ecg", "ai", "doctor", "disclaimer"],
    branding: { primaryColor: "#0369A1", secondaryColor: "#0C4A6E" },
  },
  {
    slug: "pre-employment",
    name: "Pre-Employment ECG Report",
    category: "PRE_EMPLOYMENT",
    reportType: "OCCUPATIONAL_ECG",
    description: "Pre-employment screening with occupational fitness section.",
    sections: [...BASE_SECTIONS, "occupational", "fitness"],
    branding: { primaryColor: "#0E7490", secondaryColor: "#155E75" },
  },
  {
    slug: "annual-checkup",
    name: "Annual Checkup ECG Report",
    category: "ANNUAL_CHECKUP",
    reportType: "FOLLOW_UP",
    description: "Annual wellness ECG with longitudinal comparison hooks.",
    sections: [...BASE_SECTIONS, "comparison"],
    branding: { primaryColor: "#059669", secondaryColor: "#047857" },
  },
  {
    slug: "teaching-case",
    name: "Teaching ECG Report",
    category: "TEACHING",
    reportType: "TEACHING",
    description: "De-identified teaching report with educational annotations.",
    sections: ["header", "patient", "ecg", "ai", "teaching", "attachments", "disclaimer"],
    branding: { primaryColor: "#4F46E5", secondaryColor: "#3730A3", watermark: "TEACHING" },
  },
  {
    slug: "ai-diagnostic",
    name: "AI Diagnostic ECG Report",
    category: "HOSPITAL",
    reportType: "AI_DIAGNOSTIC",
    description: "AI-first diagnostic report with confidence and differential diagnosis.",
    sections: ["header", "patient", "ecg", "ai", "attachments", "disclaimer"],
    branding: { primaryColor: "#0F766E", secondaryColor: "#115E59" },
  },
  {
    slug: "comparison-longitudinal",
    name: "Comparison ECG Report",
    category: "HOSPITAL",
    reportType: "COMPARISON",
    description: "Longitudinal ECG comparison report.",
    sections: ["header", "patient", "ecg", "ai", "comparison", "doctor", "attachments", "disclaimer"],
    branding: { primaryColor: "#0F766E", secondaryColor: "#134E4A" },
  },
];

export function templateBySlug(slug: string) {
  return ENTERPRISE_REPORT_TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function templatesForType(reportType: EnterpriseReportType) {
  return ENTERPRISE_REPORT_TEMPLATES.filter((template) => template.reportType === reportType);
}

export function templatesForCategory(category: ReportTemplateCategory) {
  return ENTERPRISE_REPORT_TEMPLATES.filter((template) => template.category === category);
}

export function defaultTemplateForType(reportType: EnterpriseReportType) {
  return templatesForType(reportType)[0] ?? ENTERPRISE_REPORT_TEMPLATES[0]!;
}

export const REPORT_TYPE_LABELS: Record<EnterpriseReportType, string> = {
  PROFESSIONAL_ECG: "Professional ECG Report",
  HOSPITAL: "Hospital Report",
  OCCUPATIONAL_ECG: "Occupational ECG Report",
  MEDICAL_FITNESS: "Medical Fitness ECG Report",
  EMERGENCY: "Emergency ECG Report",
  FOLLOW_UP: "Follow-up ECG Report",
  COMPARISON: "Comparison Report",
  AI_DIAGNOSTIC: "AI Diagnostic Report",
  TEACHING: "Teaching Report",
};

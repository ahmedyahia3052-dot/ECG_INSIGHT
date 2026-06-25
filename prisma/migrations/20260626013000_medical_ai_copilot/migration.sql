CREATE TABLE IF NOT EXISTS "CopilotConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "tag" TEXT NOT NULL DEFAULT 'ECG Interpretation',
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "patientId" TEXT,
  "caseId" TEXT,
  "contextType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CopilotConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CopilotMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "citations" JSONB,
  "confidence" DOUBLE PRECISION,
  "responseTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopilotMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CopilotSettings" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "provider" TEXT NOT NULL DEFAULT 'RuleBasedRAG',
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopilotSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CopilotUsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "conversationId" TEXT,
  "question" TEXT NOT NULL,
  "tag" TEXT,
  "responseTimeMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopilotUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ECGKnowledgeEntry" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "references" TEXT[],
  "tags" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ECGKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopilotMessage_conversationId_fkey') THEN
    ALTER TABLE "CopilotMessage"
      ADD CONSTRAINT "CopilotMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "CopilotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CopilotConversation_userId_idx" ON "CopilotConversation"("userId");
CREATE INDEX IF NOT EXISTS "CopilotConversation_patientId_idx" ON "CopilotConversation"("patientId");
CREATE INDEX IF NOT EXISTS "CopilotConversation_caseId_idx" ON "CopilotConversation"("caseId");
CREATE INDEX IF NOT EXISTS "CopilotConversation_tag_idx" ON "CopilotConversation"("tag");
CREATE INDEX IF NOT EXISTS "CopilotConversation_favorite_idx" ON "CopilotConversation"("favorite");
CREATE INDEX IF NOT EXISTS "CopilotConversation_updatedAt_idx" ON "CopilotConversation"("updatedAt");
CREATE INDEX IF NOT EXISTS "CopilotMessage_conversationId_idx" ON "CopilotMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "CopilotMessage_role_idx" ON "CopilotMessage"("role");
CREATE INDEX IF NOT EXISTS "CopilotMessage_createdAt_idx" ON "CopilotMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "CopilotUsageEvent_userId_idx" ON "CopilotUsageEvent"("userId");
CREATE INDEX IF NOT EXISTS "CopilotUsageEvent_conversationId_idx" ON "CopilotUsageEvent"("conversationId");
CREATE INDEX IF NOT EXISTS "CopilotUsageEvent_tag_idx" ON "CopilotUsageEvent"("tag");
CREATE INDEX IF NOT EXISTS "CopilotUsageEvent_createdAt_idx" ON "CopilotUsageEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ECGKnowledgeEntry_category_idx" ON "ECGKnowledgeEntry"("category");
CREATE INDEX IF NOT EXISTS "ECGKnowledgeEntry_topic_idx" ON "ECGKnowledgeEntry"("topic");

INSERT INTO "ECGKnowledgeEntry" ("id", "topic", "category", "content", "references", "tags", "updatedAt")
VALUES
  ('ecg_knowledge_arrhythmias', 'Arrhythmias', 'Arrhythmias', 'Evaluate rhythm regularity, P wave morphology, PR relationship, ventricular response, QRS width, and hemodynamic context. Atrial fibrillation is suggested by irregularly irregular rhythm without consistent P waves, but physician confirmation is required.', ARRAY['ESC atrial fibrillation guidance', 'AHA ECG interpretation standards'], ARRAY['arrhythmia','atrial fibrillation','PVC','PAC'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_stemi', 'STEMI', 'Ischemia', 'ST elevation should be interpreted by territory, reciprocal changes, symptoms, timing, and serial ECGs. Inferior, anterior, lateral, and posterior patterns require urgent clinical correlation.', ARRAY['Fourth Universal Definition of MI', 'AHA STEMI systems of care'], ARRAY['STEMI','ST elevation','ischemia'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_nstemi', 'NSTEMI', 'Ischemia', 'NSTEMI may present with ST depression, T wave inversion, dynamic changes, or normal ECG. Diagnosis requires biomarkers and clinical assessment.', ARRAY['ESC ACS guidelines'], ARRAY['NSTEMI','ST depression','troponin'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_blocks', 'Heart Blocks', 'Conduction', 'AV block interpretation requires PR interval assessment, dropped beats, AV dissociation, ventricular escape rhythm, symptoms, and medication/electrolyte review.', ARRAY['AHA bradycardia guidance'], ARRAY['AV block','PR interval','bradycardia'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_bundle_branch', 'Bundle Branch Blocks', 'Conduction', 'Bundle branch block assessment includes QRS duration, V1 and lateral lead morphology, axis, ischemic context, and comparison to previous ECGs.', ARRAY['AHA intraventricular conduction standards'], ARRAY['RBBB','LBBB','QRS'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_hypertrophy', 'Hypertrophy', 'Chamber Enlargement', 'Voltage criteria for LVH/RVH are screening signals and should be interpreted with age, body habitus, axis, repolarization strain, and echocardiography when indicated.', ARRAY['AHA ECG chamber enlargement recommendations'], ARRAY['LVH','RVH','hypertrophy'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_electrolytes', 'Electrolyte Disturbances', 'Metabolic', 'Hyperkalemia can cause peaked T waves, PR prolongation, QRS widening, sine-wave pattern, and arrhythmias. Hypokalemia can cause ST depression, U waves, and apparent QT prolongation.', ARRAY['Emergency ECG electrolyte reviews'], ARRAY['hyperkalemia','hypokalemia','electrolytes'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_qt', 'QT Disorders', 'Repolarization', 'QT prolongation should be corrected for heart rate, reviewed for medications/electrolytes/congenital risk, and considered high risk with syncope, torsades, or markedly prolonged QTc.', ARRAY['AHA QT interval recommendations'], ARRAY['long QT','QTc','torsades'], CURRENT_TIMESTAMP),
  ('ecg_knowledge_pacemaker', 'Pacemaker Rhythms', 'Devices', 'Pacemaker ECG review should assess pacing spikes, capture, sensing, underlying rhythm, QRS morphology, rate response, and device interrogation when malfunction is suspected.', ARRAY['HRS device follow-up consensus'], ARRAY['pacemaker','capture','sensing'], CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "content" = EXCLUDED."content",
  "references" = EXCLUDED."references",
  "tags" = EXCLUDED."tags",
  "updatedAt" = CURRENT_TIMESTAMP;

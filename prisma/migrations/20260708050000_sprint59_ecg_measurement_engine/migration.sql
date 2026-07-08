-- Sprint 59: persist full measurement engine bundle on ECGMeasurement
ALTER TABLE "ECGMeasurement" ADD COLUMN IF NOT EXISTS "detailsJson" JSONB;

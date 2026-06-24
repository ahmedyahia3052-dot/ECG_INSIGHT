-- Add workforce audit action used for object-level authorization ownership evidence.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_CREATED';

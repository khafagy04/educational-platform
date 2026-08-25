\set ON_ERROR_STOP on
SELECT action, "entityType", "createdAt"
FROM public."AuditLog"
ORDER BY "createdAt" DESC
LIMIT 5;

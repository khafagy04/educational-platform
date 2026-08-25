# ADR 0001: npm workspace monorepo

Status: Accepted

Use a root npm workspace containing `frontend` and `backend`. Keep backend features module-based with Controller → Service → Repository direction. Only repositories may depend on Prisma. Integration providers are accessed through interfaces so sandbox/local and production adapters share the same business services.

This gives one quality-tool entry point without coupling frontend and backend runtime deployments.

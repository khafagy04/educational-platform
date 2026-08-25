# ADR 0003: Domain events before queues

Status: Accepted

Business services publish internal domain events through an interface from the beginning. Early phases may use an in-process implementation. Phase 12 replaces delivery with BullMQ without changing business-service contracts.

Events that cause durable effects, especially payment confirmation and course completion, require stable idempotency keys. Certificate generation subscribes only when implemented in Phase 10, avoiding a Phase 8 dependency on future code.

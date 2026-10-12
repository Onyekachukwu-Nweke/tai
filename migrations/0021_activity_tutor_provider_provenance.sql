ALTER TABLE activity_tutor_requests
ADD COLUMN provider TEXT NOT NULL DEFAULT 'fake'
CHECK(provider IN ('fake','workers_ai'));

ALTER TABLE activity_tutor_requests ADD COLUMN model TEXT;

ALTER TABLE activity_tutor_requests
ADD COLUMN prompt_version TEXT NOT NULL DEFAULT 'pre-workers-ai-v1';

ALTER TABLE activity_tutor_requests
ADD COLUMN output_schema_version INTEGER NOT NULL DEFAULT 1
CHECK(output_schema_version = 1);

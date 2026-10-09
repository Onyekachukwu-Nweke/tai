ALTER TABLE activity_attempts ADD COLUMN final_answer TEXT;
ALTER TABLE activity_attempts ADD COLUMN numeric_outcome TEXT CHECK(numeric_outcome IN ('correct','incorrect'));
UPDATE activity_attempts
SET response_json=json_set(response_json,'$.numericResult',json('null'))
WHERE json_type(response_json,'$.numericResult') IS NULL;

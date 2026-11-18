-- docs/30 item 2: project_file_refs ignored uploaded fonts (`style.fontUrl` of an element, `url` of `customFonts`),
-- so the daily storage maintenance deleted fonts a design still used once they were a day old. Data only: adds the
-- missing refs of every project and every snapshot. Same sources as syncProjectFileRefs
-- (src/projects/infrastructure/project-file-refs.ts). Run before the new API and worker start.
WITH canvases AS (
  SELECT p.id AS project_id, p.canvas_state AS canvas FROM packaging_projects p
  UNION ALL
  SELECT s.project_id, s.canvas_state FROM project_snapshots s
),
keys AS (
  SELECT c.project_id, e ->> 'content' AS key
  FROM canvases c, jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.canvas -> 'elements') = 'array' THEN c.canvas -> 'elements' ELSE '[]'::jsonb END) e
  WHERE e ->> 'type' IN ('logo', 'image', 'pattern')
  UNION
  SELECT c.project_id, e -> 'style' ->> 'fontUrl'
  FROM canvases c, jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.canvas -> 'elements') = 'array' THEN c.canvas -> 'elements' ELSE '[]'::jsonb END) e
  UNION
  SELECT c.project_id, font ->> 'url'
  FROM canvases c, jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.canvas -> 'customFonts') = 'array' THEN c.canvas -> 'customFonts' ELSE '[]'::jsonb END) font
)
INSERT INTO project_file_refs (project_id, stored_file_id)
SELECT DISTINCT keys.project_id, f.id
FROM keys
JOIN stored_files f ON f.key = keys.key
ON CONFLICT DO NOTHING;

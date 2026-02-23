-- Check if drawing requirements exist
SELECT 
  dr.id,
  dr.drawing_number,
  dr.title,
  dr.status,
  dr.project_id,
  p.project_code,
  COUNT(dri.project_item_id) as item_count
FROM drawing_requirements dr
LEFT JOIN drawing_requirement_items dri ON dri.drawing_requirement_id = dr.id
LEFT JOIN projects p ON p.id = dr.project_id
WHERE p.project_code = 'C5-2026-010'
GROUP BY dr.id, p.project_code;

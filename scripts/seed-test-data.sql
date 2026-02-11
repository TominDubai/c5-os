-- C5 OS Test Data
-- Run this in Supabase SQL Editor to populate test data
-- Delete later by running: DELETE FROM projects WHERE name LIKE 'TEST:%';

-- Test Client
INSERT INTO clients (id, name, company, email, phone, address, emirates)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Ahmed Al Maktoum',
  'Palm Developments LLC',
  'ahmed@palmdev.ae',
  '+971 50 123 4567',
  'Villa 23, Palm Jumeirah',
  'Dubai'
);

-- Test Enquiry
INSERT INTO enquiries (id, enquiry_number, client_id, client_name, project_type, location, source, description, status)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'ENQ-2026-TEST',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Ahmed Al Maktoum',
  'kitchen',
  'Palm Jumeirah, Dubai',
  'Referral',
  'Full kitchen renovation for villa - high-end finishes required',
  'won'
);

-- Test Quote
INSERT INTO quotes (id, quote_number, enquiry_id, client_id, title, description, subtotal, vat_rate, vat_amount, total, status, valid_until)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'QT-2026-TEST',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Kitchen - Villa Palm Jumeirah',
  'Complete kitchen cabinetry and island',
  95000.00,
  5.00,
  4750.00,
  99750.00,
  'converted',
  '2026-03-15'
);

-- Test Quote Items
INSERT INTO quote_items (id, quote_id, item_code, description, type_code, floor_code, room_code, sequence, quantity, unit_price, total_price, sort_order) VALUES
('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-001', 'Base cabinet 600mm - soft close', 'K', 'GF', 'RM01', 1, 4, 2400.00, 9600.00, 1),
('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-002', 'Base cabinet 900mm - soft close', 'K', 'GF', 'RM01', 2, 2, 3200.00, 6400.00, 2),
('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-003', 'Wall cabinet 600mm', 'K', 'GF', 'RM01', 3, 6, 1800.00, 10800.00, 3),
('dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-004', 'Wall cabinet 900mm', 'K', 'GF', 'RM01', 4, 2, 2400.00, 4800.00, 4),
('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-005', 'Tall pantry unit 600mm', 'K', 'GF', 'RM01', 5, 2, 8500.00, 17000.00, 5),
('dddddddd-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-006', 'Corner cabinet with carousel', 'K', 'GF', 'RM01', 6, 1, 4500.00, 4500.00, 6),
('dddddddd-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-007', 'Island unit with storage', 'K', 'GF', 'RM01', 7, 1, 18000.00, 18000.00, 7),
('dddddddd-0000-0000-0000-000000000008', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-008', 'Island countertop - marble', 'K', 'GF', 'RM01', 8, 1, 12000.00, 12000.00, 8),
('dddddddd-0000-0000-0000-000000000009', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-009', 'Drawer unit 600mm - 4 drawers', 'K', 'GF', 'RM01', 9, 2, 3200.00, 6400.00, 9),
('dddddddd-0000-0000-0000-000000000010', 'cccccccc-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-010', 'Appliance housing unit', 'K', 'GF', 'RM01', 10, 1, 5500.00, 5500.00, 10);

-- Test Project
INSERT INTO projects (id, project_code, quote_id, client_id, name, description, site_address, emirates, project_type, contract_value, status, start_date, target_completion)
VALUES (
  'eeeeeeee-0000-0000-0000-000000000001',
  'C5-2026-TEST',
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'TEST: Kitchen - Villa Palm Jumeirah',
  'Complete kitchen renovation with island',
  'Villa 23, Palm Jumeirah, Dubai',
  'Dubai',
  'kitchen',
  99750.00,
  'in_production',
  '2026-02-01',
  '2026-03-30'
);

-- Test Project Items (various statuses to show the flow)
INSERT INTO project_items (id, project_id, quote_item_id, item_code, description, type_code, floor_code, room_code, sequence, quantity, status, production_started_at, production_completed_at, workshop_qc_at, workshop_qc_passed, dispatched_at, installed_at) VALUES
-- Pre-production (2 items)
('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000009', '26PJ-K-GF-RM01-009', 'Drawer unit 600mm - 4 drawers', 'K', 'GF', 'RM01', 9, 2, 'pre_production', NULL, NULL, NULL, NULL, NULL, NULL),
('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000010', '26PJ-K-GF-RM01-010', 'Appliance housing unit', 'K', 'GF', 'RM01', 10, 1, 'pre_production', NULL, NULL, NULL, NULL, NULL, NULL),
-- In production (2 items)
('ffffffff-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000007', '26PJ-K-GF-RM01-007', 'Island unit with storage', 'K', 'GF', 'RM01', 7, 1, 'in_production', '2026-02-08 09:00:00+04', NULL, NULL, NULL, NULL, NULL),
('ffffffff-0000-0000-0000-000000000004', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000008', '26PJ-K-GF-RM01-008', 'Island countertop - marble', 'K', 'GF', 'RM01', 8, 1, 'in_production', '2026-02-09 09:00:00+04', NULL, NULL, NULL, NULL, NULL),
-- Ready for QC (2 items)
('ffffffff-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000005', '26PJ-K-GF-RM01-005', 'Tall pantry unit 600mm', 'K', 'GF', 'RM01', 5, 2, 'ready_for_qc', '2026-02-05 09:00:00+04', '2026-02-08 16:00:00+04', NULL, NULL, NULL, NULL),
('ffffffff-0000-0000-0000-000000000006', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000006', '26PJ-K-GF-RM01-006', 'Corner cabinet with carousel', 'K', 'GF', 'RM01', 6, 1, 'ready_for_qc', '2026-02-06 09:00:00+04', '2026-02-09 14:00:00+04', NULL, NULL, NULL, NULL),
-- Ready for dispatch (1 item)
('ffffffff-0000-0000-0000-000000000007', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000004', '26PJ-K-GF-RM01-004', 'Wall cabinet 900mm', 'K', 'GF', 'RM01', 4, 2, 'ready_for_dispatch', '2026-02-03 09:00:00+04', '2026-02-06 16:00:00+04', '2026-02-07 10:00:00+04', true, NULL, NULL),
-- On site (1 item)
('ffffffff-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', '26PJ-K-GF-RM01-003', 'Wall cabinet 600mm', 'K', 'GF', 'RM01', 3, 6, 'on_site', '2026-02-01 09:00:00+04', '2026-02-04 16:00:00+04', '2026-02-05 10:00:00+04', true, '2026-02-06 08:00:00+04', NULL),
-- Installed (1 item)  
('ffffffff-0000-0000-0000-000000000009', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', '26PJ-K-GF-RM01-002', 'Base cabinet 900mm - soft close', 'K', 'GF', 'RM01', 2, 2, 'installed', '2026-02-01 09:00:00+04', '2026-02-03 16:00:00+04', '2026-02-04 10:00:00+04', true, '2026-02-05 08:00:00+04', '2026-02-08 14:00:00+04'),
-- QS Verified (1 item)
('ffffffff-0000-0000-0000-000000000010', 'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', '26PJ-K-GF-RM01-001', 'Base cabinet 600mm - soft close', 'K', 'GF', 'RM01', 1, 4, 'qs_verified', '2026-02-01 09:00:00+04', '2026-02-02 16:00:00+04', '2026-02-03 10:00:00+04', true, '2026-02-04 08:00:00+04', '2026-02-06 14:00:00+04');

-- =============================================
-- TO DELETE ALL TEST DATA, RUN:
-- =============================================
-- DELETE FROM project_items WHERE project_id = 'eeeeeeee-0000-0000-0000-000000000001';
-- DELETE FROM projects WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
-- DELETE FROM quote_items WHERE quote_id = 'cccccccc-0000-0000-0000-000000000001';
-- DELETE FROM quotes WHERE id = 'cccccccc-0000-0000-0000-000000000001';
-- DELETE FROM enquiries WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
-- DELETE FROM clients WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

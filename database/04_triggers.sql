-- =============================================================================
-- 04_triggers.sql  -  TRIGGERS (graded requirement: at least 2 triggers)
-- =============================================================================
USE hostel_db;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- TRIGGER 1: trg_alloc_after_insert  (AFTER INSERT on room_allocations)
--   When a student is allocated a bed, automatically:
--     * decrement the room's available_beds by 1
--     * flip the room status to 'full' when the last bed is taken
--   This keeps rooms.available_beds correct without the app having to remember.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_alloc_after_insert $$
CREATE TRIGGER trg_alloc_after_insert
AFTER INSERT ON room_allocations
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE rooms
           SET available_beds = available_beds - 1,
               status = CASE WHEN available_beds - 1 <= 0 THEN 'full' ELSE status END
         WHERE room_id = NEW.room_id;
    END IF;
END $$

-- -----------------------------------------------------------------------------
-- TRIGGER 2: trg_complaint_before_insert  (BEFORE INSERT on complaints)
--   Force every new complaint to start as 'pending', stamped with the current
--   time, and with no resolved_at / remark yet - regardless of what the client
--   sends.  Demonstrates a BEFORE trigger mutating NEW.* values.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_complaint_before_insert $$
CREATE TRIGGER trg_complaint_before_insert
BEFORE INSERT ON complaints
FOR EACH ROW
BEGIN
    SET NEW.status      = 'pending';
    SET NEW.created_at  = NOW();
    SET NEW.resolved_at = NULL;
    SET NEW.admin_remark = NULL;
END $$

-- -----------------------------------------------------------------------------
-- TRIGGER 3 (bonus): trg_alloc_after_update  (AFTER UPDATE on room_allocations)
--   When an allocation is vacated (status active -> vacated) give the bed back:
--   increment available_beds and re-open the room.  Mirror image of trigger 1.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_alloc_after_update $$
CREATE TRIGGER trg_alloc_after_update
AFTER UPDATE ON room_allocations
FOR EACH ROW
BEGIN
    IF OLD.status = 'active' AND NEW.status = 'vacated' THEN
        UPDATE rooms
           SET available_beds = LEAST(available_beds + 1, capacity),
               status = CASE WHEN status = 'full' THEN 'available' ELSE status END
         WHERE room_id = NEW.room_id;
    END IF;
END $$

-- -----------------------------------------------------------------------------
-- TRIGGER 4 (bonus): trg_complaint_before_update  (BEFORE UPDATE on complaints)
--   Auto-stamp resolved_at the moment a complaint is marked 'resolved', and
--   clear it again if it is re-opened.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_complaint_before_update $$
CREATE TRIGGER trg_complaint_before_update
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
        SET NEW.resolved_at = NOW();
    ELSEIF NEW.status <> 'resolved' THEN
        SET NEW.resolved_at = NULL;
    END IF;
END $$

DELIMITER ;

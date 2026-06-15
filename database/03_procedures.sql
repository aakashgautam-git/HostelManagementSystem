
USE hostel_db;

DELIMITER $$


DROP PROCEDURE IF EXISTS allocate_room $$
CREATE PROCEDURE allocate_room (IN p_student_id INT, IN p_room_id INT)
BEGIN
    DECLARE v_free   INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_active INT;

    
    SELECT available_beds, status
      INTO v_free, v_status
      FROM rooms
     WHERE room_id = p_room_id
     FOR UPDATE;

    IF v_free IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room does not exist';
    END IF;

    IF v_status = 'maintenance' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room is under maintenance';
    END IF;

    IF v_free <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No vacancy: room is full';
    END IF;

    SELECT COUNT(*) INTO v_active
      FROM room_allocations
     WHERE student_id = p_student_id AND status = 'active';

    IF v_active > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student already has an active room allocation';
    END IF;

    INSERT INTO room_allocations (student_id, room_id)
    VALUES (p_student_id, p_room_id);
    -- trg_alloc_after_insert now decrements rooms.available_beds automatically
END $$


DROP PROCEDURE IF EXISTS generate_monthly_bill $$
CREATE PROCEDURE generate_monthly_bill (IN p_student_id INT)
BEGIN
    DECLARE v_month DATE;
    DECLARE v_rent  DECIMAL(10,2);
    DECLARE v_mess  DECIMAL(10,2);
    DECLARE v_fine  DECIMAL(10,2);

    
    SET v_month = DATE_FORMAT(CURRENT_DATE, '%Y-%m-01');

    
    SELECT COALESCE(r.monthly_rent, 0)
      INTO v_rent
      FROM room_allocations ra
      JOIN rooms r ON r.room_id = ra.room_id
     WHERE ra.student_id = p_student_id AND ra.status = 'active'
     LIMIT 1;
    IF v_rent IS NULL THEN SET v_rent = 0; END IF;

    
    SELECT COALESCE(SUM(price), 0)
      INTO v_mess
      FROM meal_bookings
     WHERE student_id = p_student_id
       AND status = 'booked'
       AND meal_date >= v_month
       AND meal_date <  v_month + INTERVAL 1 MONTH;

   
    SELECT COALESCE(SUM(amount), 0)
      INTO v_fine
      FROM fines
     WHERE student_id = p_student_id AND status = 'unpaid';

    INSERT INTO bills (student_id, bill_month, rent_amount, mess_amount, fine_amount)
    VALUES (p_student_id, v_month, v_rent, v_mess, v_fine)
    ON DUPLICATE KEY UPDATE
        rent_amount = v_rent,
        mess_amount = v_mess,
        fine_amount = v_fine;

    
    UPDATE fines
       SET status = 'billed'
     WHERE student_id = p_student_id AND status = 'unpaid';
END $$

DELIMITER ;

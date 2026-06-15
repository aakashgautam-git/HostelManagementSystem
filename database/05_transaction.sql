-- =============================================================================
-- 05_transaction.sql  -  TRANSACTION (graded: >= 1 START TRANSACTION/COMMIT/ROLLBACK)
-- -----------------------------------------------------------------------------
-- Fee payment is the classic "all-or-nothing" operation.  Paying a bill must do
-- THREE writes that have to succeed or fail together:
--     (1) deduct the amount from the student's wallet balance
--     (2) INSERT an immutable row into the payments ledger
--     (3) UPDATE the bill's paid_amount and status
-- If any single step fails (e.g. insufficient balance, bad bill id) we ROLLBACK
-- so the database is left exactly as it was.  Only when all three succeed do we
-- COMMIT.
--
-- We wrap it in a stored procedure so the transaction logic lives in the DB and
-- can be unit-tested from a SQL client:   CALL pay_bill(1, 1, 500.00);
-- The Express backend simply calls this procedure.
-- =============================================================================
USE hostel_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS pay_bill $$
CREATE PROCEDURE pay_bill (
    IN p_student_id INT,
    IN p_bill_id    INT,
    IN p_amount     DECIMAL(10,2)
)
BEGIN
    DECLARE v_balance DECIMAL(10,2);
    DECLARE v_due     DECIMAL(10,2);

    -- If ANY statement throws, undo everything and bubble the error up.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- ---- begin all-or-nothing block --------------------------------------
    START TRANSACTION;

        -- Lock the student + bill rows so concurrent payments can't double-spend
        SELECT balance
          INTO v_balance
          FROM students
         WHERE student_id = p_student_id
         FOR UPDATE;

        SELECT (total_amount - paid_amount)
          INTO v_due
          FROM bills
         WHERE bill_id = p_bill_id AND student_id = p_student_id
         FOR UPDATE;

        -- ---- validation: any failure jumps to the EXIT HANDLER -> ROLLBACK
        IF v_balance IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
        END IF;
        IF v_due IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bill not found for this student';
        END IF;
        IF p_amount <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount must be positive';
        END IF;
        IF p_amount > v_due THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount exceeds outstanding due';
        END IF;
        IF p_amount > v_balance THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient wallet balance';
        END IF;

        -- (1) deduct from wallet
        UPDATE students
           SET balance = balance - p_amount
         WHERE student_id = p_student_id;

        -- (2) write the payment to the ledger
        INSERT INTO payments (student_id, bill_id, amount, method)
        VALUES (p_student_id, p_bill_id, p_amount, 'wallet');

        -- (3) apply it to the bill and recompute its status
        UPDATE bills
           SET paid_amount = paid_amount + p_amount,
               status = CASE
                          WHEN paid_amount + p_amount >= total_amount THEN 'paid'
                          ELSE 'partial'
                        END
         WHERE bill_id = p_bill_id;

    COMMIT;
    -- ---- end all-or-nothing block ----------------------------------------
END $$

DELIMITER ;

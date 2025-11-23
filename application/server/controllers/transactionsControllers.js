import { pool } from "../db/db.js";

export const getTransactionsDetails = async (req, res) => {
    try {
        const { account_no } = req.body;

        if (!account_no) {
            return res.status(400).json({ error: "Account number is required" });
        }

        const result = await pool.query(
            `SELECT * FROM transactions
                WHERE account_no = $1 
                    OR from_acc = $1 
                    OR to_acc = $1
                ORDER BY created_at DESC`,
            [account_no]
        );


        res.json(result.rows);
    } catch (err) {
        console.log("Error", err);
        res.status(500).json({ error: "Server error" });
    }
};

export const getRecentTransactionDetails = async (req, res) => {
    try {
        const { account_no } = req.body;

        if (!account_no) {
            return res.status(400).json({ error: "Account number is required" });
        }

        const result = await pool.query(
            `SELECT * FROM transactions
                WHERE account_no = $1 
                    OR from_acc = $1 
                    OR to_acc = $1
                ORDER BY created_at DESC LIMIT 1`,
            [account_no]
        );


        res.json(result.rows);
    } catch (err) {
        console.log("Error", err);
        res.status(500).json({ error: "Server error" });
    }
};

export const transferMoney = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            email,
            phone,
            account_no,
            name,
            from_acc,
            to_acc,
            amount,
            sender_details,
            type,
            description,
            from_upi,
            to_upi,
            pin
        } = req.body;

        if (!email || !phone) {
            return res.status(400).json({ error: "email and phone are required" });
        }
        if (!account_no || !from_acc || !to_acc) {
            return res.status(400).json({ error: "Account numbers are required" });
        }
        if (!amount) {
            return res.status(400).json({ error: "Amount is required" });
        }
        if (!pin) {
            return res.status(400).json({ error: "PIN is required" });
        }

        await client.query("BEGIN");

        // 🔍 1. VERIFY PIN
        const pinResult = await client.query(
            `SELECT password FROM users WHERE email = $1 AND phone_no = $2`,
            [email, phone]
        );

        if (pinResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "User not found" });
        }

        const storedPassword = pinResult.rows[0].password;

        if (storedPassword !== pin) {
            await client.query("ROLLBACK");
            return res.status(401).json({ error: "Incorrect PIN" });
        }

        // 🔍 2. CHECK BALANCE
        const checkBalance = await client.query(
            `SELECT balance FROM accounts WHERE account_no = $1`,
            [from_acc]
        );

        if (checkBalance.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Sender account not found" });
        }

        if (checkBalance.rows[0].balance < amount) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Insufficient balance" });
        }

        // 🔄 3. PROCESS PAYMENT
        await client.query(
            `UPDATE accounts SET balance = balance - $1 WHERE account_no = $2`,
            [amount, from_acc]
        );

        await client.query(
            `UPDATE accounts SET balance = balance + $1 WHERE account_no = $2`,
            [amount, to_acc]
        );

        const transactions_id = "TXN" + Math.floor(100000 + Math.random() * 900000);

        const result = await client.query(
            `INSERT INTO transactions (
                account_no, name, from_acc, to_acc, amount, status, transactions_id,
                date, time, sender_details, type, method, description, reference_no,
                category, receipt_url, is_flagged, created_at, from_upi, to_upi
            ) VALUES (
                $1, $2, $3, $4, $5, 'Success', $6,
                CURRENT_DATE, CURRENT_TIME, $7, $8, 'UPI', $9, $10,
                NULL, NULL, FALSE, NOW(), $11, $12
            ) RETURNING *`,
            [
                account_no, name, from_acc, to_acc, amount,
                transactions_id, sender_details, type, description,
                "REF" + Math.floor(10000 + Math.random() * 90000),
                from_upi, to_upi
            ]
        );

        await client.query("COMMIT");

        res.json(result.rows[0]);

    } catch (err) {
        await client.query("ROLLBACK");
        console.log("Error:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
};


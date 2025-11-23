import { pool } from "../db/db.js";

export const getUsers = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: "Email and phone are required" });
    }

    const result = await pool.query("SELECT phone_no, email, serial_no, name, upi_id, age, gender, language, address, pin_code FROM users WHERE email = $1 AND phone_no = $2",[email, phone]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const searchUser = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const sql = `
      SELECT phone_no, email, serial_no, name, upi_id, age, gender, language, address, pin_code
      FROM users
      WHERE 
        upi_id ILIKE $1
        OR phone_no::text ILIKE $1
    `;

    const result = await pool.query(sql, [`%${query}%`]);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: "Email and phone are required" });
    }

    const result = await pool.query("SELECT password FROM users WHERE email = $1 AND phone_no = $2",[email, phone]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Validate input fields
    if (!email || !phone || !password) {
      return res.status(400).json({ error: "Email, phone, and password are required" });
    }

    // Check user exists with matching email + phone
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND phone_no = $2",
      [email, phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or phone" });
    }

    const user = result.rows[0];

    // Compare plain-text password
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Success
    return res.json({
      message: "Login successful",
      user: {
        email: user.email,
        phone: user.phone_no,
      },
      success: true
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

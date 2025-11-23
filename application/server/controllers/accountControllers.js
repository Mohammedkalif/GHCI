import { pool } from "../db/db.js";

export const getAccountDetails = async (req,res) => {
    try{
        const { email, phone } = req.body;

        if (!email || !phone) {
            return res.status(400).json({ error: "Email and phone are required" });
        }

        const result = await pool.query("SELECT * FROM accounts WHERE email = $1 AND phone_no = $2",[email,phone]);
        res.json(result.rows)
    } catch(err){
        console.log("Error",err);
    }
}

export const getAccountNumber = async (req,res) => {
    try{
        const { email, phone } = req.body;

        if (!email || !phone) {
            return res.status(400).json({ error: "Email and phone are required" });
        }

        const result = await pool.query("SELECT account_no FROM accounts WHERE email = $1 AND phone_no = $2",[email,phone]);
        res.json(result.rows)
    } catch(err){
        console.log("Error",err);
    }
}

export const getAccountBalance = async (req,res) => {
    try{
        const { email, phone, account_no } = req.body;

        if (!email || !phone) {
            return res.status(400).json({ error: "Email and phone are required" });
        }        
        if (!account_no) {
            return res.status(400).json({ error: "Account no. is required" });
        }        

        const result = await pool.query("SELECT balance FROM accounts WHERE email = $1 AND phone_no = $2 AND account_no = $3",[email,phone,account_no]);
        res.json(result.rows)
    } catch(err){
        console.log("Error",err);
    }
}

export const getPrimaryAccount = async (req, res) => {
  const { email, phone } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM accounts 
       WHERE email = $1 AND phone_no = $2 AND is_primary_account = TRUE`,
      [email, phone]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No primary account found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

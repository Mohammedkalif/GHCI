import { pool } from "../db/db.js";

export const getMyInvestDetails = async (req,res) => {
    try{
        const { account_no } = req.body;
        
        if (!account_no) {
            return res.status(400).json({ error: "Account number is required" });
        }

        const result = await pool.query("SELECT * FROM my_investments WHERE account_no = $1",[account_no]);
        res.json(result.rows)
    } catch(err){
        console.log("Error",err);
    }
}

export const getAvailInvestDetails = async (req,res) => {
    try{

        const result = await pool.query("SELECT * FROM avail_investments");
        res.json(result.rows)
    } catch(err){
        console.log("Error",err);
    }
}
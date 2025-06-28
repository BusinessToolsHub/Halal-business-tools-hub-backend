const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

router.post("/", async (req, res) => {
    const { name, type, description, riba, incomeNature, industry, transparency, incomeSource, ethics } = req.body;

    const prompt = `
You are a qualified Islamic finance expert.

Evaluate the investment below and give your answer in this exact format:

Verdict: Halal / Haram / Mashbooh  
Reason: [2-4 sentences explaining why. Be clear, informative, and use Islamic finance terminology like Riba, Gharar, unethical sectors, etc.]

Avoid soft/unclear phrases. Use confident tone. Respond with only those 2 lines and include a newline between them.

Investment Details:
- Name: ${name}
- Type: ${type}
- Description: ${description || "N/A"}
- Riba Involved: ${riba}
- Income Nature: ${incomeNature}
- Industry: ${industry}
- Transparency: ${transparency}
- Income Source: ${incomeSource}
- Ethical Concerns: ${ethics}
`;



    try {
        const response = await axios.post(
            "https://api.together.xyz/v1/chat/completions",
            {
                model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.4,
            },
            {
                headers: {
                    Authorization: `Bearer ${TOGETHER_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const result = response.data.choices[0].message.content.trim();
        res.json({ response: result });

    } catch (error) {
        console.error("Together API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to evaluate investment using AI." });
    }
});

module.exports = router;

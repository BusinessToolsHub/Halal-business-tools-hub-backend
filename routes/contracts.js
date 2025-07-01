const express = require('express');
const pool = require('../db');
const router = express.Router();

const MAX_FREE_GENERATIONS = 100;

/* ✅ Clause-Based Templates */
const CONTRACT_CLAUSES = {
  NDA: [
    {
      id: 'purpose',
      title: 'Purpose',
      required: true,
      content: () => `The Parties wish to explore a business relationship and may disclose confidential information.`
    },
    {
      id: 'confidential_info',
      title: 'Definition of Confidential Information',
      required: true,
      content: () => `"Confidential Information" means any non-public information disclosed in any form, including written, oral, or digital.`
    },
    {
      id: 'obligations',
      title: 'Obligations of Receiving Party',
      required: true,
      content: () => `Each Party agrees not to disclose confidential information to third parties without prior written consent.`
    },
    {
      id: 'term',
      title: 'Term and Termination',
      required: false,
      content: () => `This Agreement shall remain in effect for 2 years unless terminated earlier in writing by either Party.`
    },
    {
      id: 'governing_law',
      title: 'Governing Law',
      required: false,
      content: () => `This Agreement shall be governed by the laws of the Islamic Republic of Pakistan.`
    }
  ],

  Freelance: [
    {
      id: 'scope',
      title: 'Scope of Work',
      required: true,
      content: ({ fields }) => `The Freelancer agrees to perform the following services: ${fields["Service Description"]}.`
    },
    {
      id: 'payment',
      title: 'Payment Terms',
      required: true,
      content: ({ fields }) => `The Client agrees to pay a total of ${fields["Amount"]} upon successful completion of the service.`
    },
    {
      id: 'deadline',
      title: 'Delivery Deadline',
      required: true,
      content: ({ fields }) => `The service must be completed by ${fields["Deadline"]}.`
    },
    {
      id: 'ownership',
      title: 'Ownership of Work',
      required: false,
      content: () => `All deliverables produced under this Agreement shall be the exclusive property of the Client upon final payment.`
    },
    {
      id: 'termination',
      title: 'Termination Clause',
      required: false,
      content: () => `Either party may terminate this Agreement with a 7-day written notice.`
    }
  ],

  Partnership: [
    {
      id: 'purpose',
      title: 'Purpose',
      required: true,
      content: () => `The Partners agree to operate a business together for mutual benefit under the business name provided.`
    },
    {
      id: 'capital',
      title: 'Capital Contribution',
      required: true,
      content: () => `Each Partner agrees to contribute capital to the business as mutually decided.`
    },
    {
      id: 'profit_sharing',
      title: 'Profit Sharing',
      required: true,
      content: ({ fields }) => `Profits and losses shall be shared as follows: ${fields["Share Percentage"]} to each Partner.`
    },
    {
      id: 'management',
      title: 'Management Responsibilities',
      required: false,
      content: () => `All major business decisions will be made jointly and documented.`
    },
    {
      id: 'governing_law',
      title: 'Governing Law',
      required: false,
      content: () => `This Agreement shall be governed by the laws of the Islamic Republic of Pakistan.`
    }
  ],

  Mudarabah: [
    {
      id: 'parties',
      title: 'Parties',
      required: true,
      content: ({ fields }) => `This Agreement is made between the Investor (Rabb-ul-Maal): ${fields["Investor Name"]}, and the Entrepreneur (Mudarib): ${fields["Entrepreneur Name"]}.`
    },
    {
      id: 'investment',
      title: 'Investment Amount',
      required: true,
      content: ({ fields }) => `The Investor agrees to provide a capital of ${fields["Investment Amount"]} for the business venture.`
    },
    {
      id: 'profit_sharing',
      title: 'Profit Sharing Ratio',
      required: true,
      content: ({ fields }) => `Profits will be shared as follows: ${fields["Profit Ratio"]} to the Mudarib, and the remainder to the Rabb-ul-Maal.`
    },
    {
      id: 'duration',
      title: 'Duration of Agreement',
      required: false,
      content: ({ fields }) => `This Agreement shall remain in effect for ${fields["Duration"]} unless terminated earlier.`
    },
    {
      id: 'termination',
      title: 'Termination Conditions',
      required: false,
      content: () => `Either party may terminate the Agreement with due notice, provided all financial matters are settled.`
    }
  ],

  Musharakah: [
    {
      id: 'partners',
      title: 'Partners and Contributions',
      required: true,
      content: ({ fields }) => `Partner A: ${fields["Partner A"]} and Partner B: ${fields["Partner B"]} agree to jointly invest in the business.`
    },
    {
      id: 'capital_split',
      title: 'Capital Contributions',
      required: true,
      content: ({ fields }) => `Partner A contributes ${fields["Capital A"]}, and Partner B contributes ${fields["Capital B"]}.`
    },
    {
      id: 'profit_loss',
      title: 'Profit and Loss Sharing',
      required: true,
      content: ({ fields }) => `Profits and losses will be shared as agreed: ${fields["Profit Ratio"]}.`
    },
    {
      id: 'management_roles',
      title: 'Roles and Responsibilities',
      required: false,
      content: () => `Both partners shall participate in management, unless otherwise agreed.`
    },
    {
      id: 'termination',
      title: 'Termination Clause',
      required: false,
      content: () => `The partnership may be dissolved with mutual consent or breach of terms.`
    }
  ],

  QardHasan: [
    {
      id: 'loan_parties',
      title: 'Parties Involved',
      required: true,
      content: ({ fields }) => `Lender: ${fields["Lender"]}, Borrower: ${fields["Borrower"]}.`
    },
    {
      id: 'loan_amount',
      title: 'Loan Amount and Purpose',
      required: true,
      content: ({ fields }) => `The Borrower acknowledges receipt of ${fields["Loan Amount"]} for the purpose: ${fields["Purpose"]}.`
    },
    {
      id: 'repayment_terms',
      title: 'Repayment Terms',
      required: true,
      content: ({ fields }) => `The Borrower agrees to repay the loan by ${fields["Repayment Date"]} without interest.`
    },
    {
      id: 'collateral',
      title: 'Collateral (if any)',
      required: false,
      content: ({ fields }) => `The Borrower pledges the following collateral: ${fields["Collateral"] || "None"}.`
    },
    {
      id: 'governing_law',
      title: 'Governing Law',
      required: false,
      content: () => `This Agreement is governed by Islamic Shariah and the laws of the Islamic Republic of Pakistan.`
    }
  ]
};


/* ✅ Clause Formatter */
function generateFormattedContract(type, fields) {
  const template = CONTRACT_CLAUSES[type];
  if (!template) return 'Invalid contract type selected.';

  const selectedClauses = template; // ✅ include all clauses unconditionally

  const clauseText = selectedClauses
    .map((clause, index) => `${index + 1}. ${clause.title}\n${clause.content({ fields })}\n`)
    .join('\n');

  const header = `\n\nThis Agreement is entered into on ${fields["Agreement Date"] || new Date() || "__________"} between:\n\n`;

  let parties = '';
  if (type === 'NDA') {
    parties = `Party A: ${fields["Party A"] || "__________"}\nParty B: ${fields["Party B"] || "__________"}\n\n`;
  } else if (type === 'Freelance') {
    parties = `Client: ${fields["Client Name"] || "__________"}\nFreelancer: ${fields["Freelancer Name"] || "__________"}\n\n`;
  } else if (type === 'Partnership') {
    parties = `Partner A: ${fields["Partner A"] || "__________"}\nPartner B: ${fields["Partner B"] || "__________"}\nBusiness Name: ${fields["Business Name"] || "__________"}\n\n`;
  }

  const footer = `IN WITNESS WHEREOF, the parties have executed this Agreement:\n\nSignature of Party A: _________________________\n\nSignature of Party B: _________________________`;

  return `${header}${parties}${clauseText}\n${footer}`;
}


/* ✅ Usage Limit Checker */
async function checkFreeUses(ip) {
  const result = await pool.query(
    'SELECT free_uses FROM ip_tracking WHERE ip_address = $1',
    [ip]
  );

  if (result.rows.length === 0) {
    await pool.query(
      'INSERT INTO ip_tracking (ip_address, free_uses, last_used_at) VALUES ($1, $2, NOW())',
      [ip, 1]
    );
    return { allowed: true, remaining: MAX_FREE_GENERATIONS - 1 };
  }

  const used = result.rows[0].free_uses;
  if (used >= MAX_FREE_GENERATIONS) {
    return { allowed: false, remaining: 0 };
  }

  await pool.query(
    'UPDATE ip_tracking SET free_uses = free_uses + 1, last_used_at = NOW() WHERE ip_address = $1',
    [ip]
  );

  return { allowed: true, remaining: MAX_FREE_GENERATIONS - used - 1 };
}

/* ✅ POST /api/contracts/generate */
router.post('/generate', async (req, res) => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const { contractType, formData } = req.body;
    
    
    const usage = await checkFreeUses(ip);
    if (!usage.allowed) {
        return res.status(403).json({
            error: 'Free usage limit reached. Please upgrade to continue.',
        });
    }
    const formattedContract = generateFormattedContract(contractType, formData);


    await pool.query(
      'INSERT INTO contract_generations (ip_address, contract_type, used_fields) VALUES ($1, $2, $3)',
      [ip, contractType, formData]
    );

    res.json({
      success: true,
      remainingFreeUses: usage.remaining,
      contract: formattedContract
    });
  } catch (error) {
    console.error('❌ Error generating contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

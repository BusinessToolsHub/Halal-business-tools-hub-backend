const express = require('express');
const pool = require('../db');
const router = express.Router();

const MAX_FREE_GENERATIONS = parseInt(process.env.MAX_FREE_GENERATIONS || '5');

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
      id: 'parties',
      title: 'Parties Involved',
      required: true,
      content: ({ fields }) => `Client: ${fields["Client Name"]}, Freelancer: ${fields["Freelancer Name"] || "__________"}`
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
  ],
  Ijarah: [
    {
      id: 'parties',
      title: 'Parties Involved',
      required: true,
      content: () => `This Agreement is made between the Lessor and the Lessee for leasing a specific asset.`,
    },
    {
      id: 'asset_description',
      title: 'Leased Asset Description',
      required: true,
      content: ({ fields }) => `The asset to be leased is described as: ${fields["Asset Description"] || "__________"}.`
    },

    {
      id: 'lease_term',
      title: 'Lease Term and Rent',
      required: true,
      content: ({ fields }) =>
        `The lease shall commence on the agreed date and continue for the term: ${fields["Lease Term"] || "__________"}, with monthly rent of ${fields["Monthly Rent"] || "__________"}.`
    },

    {
      id: 'maintenance',
      title: 'Maintenance and Liability',
      required: false,
      content: () => `The Lessor is responsible for major maintenance while the Lessee handles minor repairs and upkeep.`,
    },
    {
      id: 'termination',
      title: 'Termination Clause',
      required: false,
      content: () => `Either Party may terminate this Agreement under mutual consent or upon breach of terms.`,
    },
  ],
  Wakalah: [
    {
      id: 'agency_scope',
      title: 'Agency Scope',
      required: true,
      content: ({ fields }) => `The Agent is authorized to act on behalf of the Principal in matters relating to ${fields["Scope of Agency"] || "__________"}.`,
    },
    {
      id: 'duration',
      title: 'Duration of Agreement',
      required: true,
      content: ({ fields }) => `This Agency Agreement shall be valid for ${fields["Duration"] || "__________"}.`,
    },
    {
      id: 'parties',
      title: 'Parties Involved',
      required: true,
      content: ({ fields }) => `Principal: ${fields["Principal Name"]}, Agent: ${fields["Agent Name"]}`
    },
    {
      id: 'compensation',
      title: 'Compensation and Reimbursements',
      required: false,
      content: ({ fields }) => `The Agent shall be compensated ${fields["Compensation"] || "__________"} and reimbursed for all reasonable expenses incurred.`,
    },
    {
      id: 'duties',
      title: 'Duties of Agent',
      required: true,
      content: () => `The Agent must act with honesty, diligence, and in the best interests of the Principal.`,
    },
    {
      id: 'law',
      title: 'Governing Law',
      required: false,
      content: () => `This Agreement shall be governed by the laws of the Islamic Republic of Pakistan.`,
    },
  ],
  Murabaha: [
    {
      id: 'asset_terms',
      title: 'Asset Purchase and Sale Terms',
      required: true,
      content: ({ fields }) => `The Seller agrees to sell the asset at cost plus a profit margin of ${fields["Profit Margin"] || "__________"} % with full disclosure.`,
    },
    {
      id: 'parties',
      title: 'Parties Involved',
      required: true,
      content: ({ fields }) => `Seller: ${fields["Seller Name"]}, Buyer: ${fields["Buyer Name"]}, Asset: ${fields["Asset Description"]}`
    },
    {
      id: 'payment_terms',
      title: 'Payment Terms',
      required: true,
      content: ({ fields }) => `The Buyer agrees to pay the total amount ${fields["Purchase Price"] || "__________"} in ${fields["Payment Terms"] || "__________"} according to agreed schedule.`,
    },
    {
      id: 'profit_disclosure',
      title: 'Disclosure of Profit',
      required: true,
      content: () => `The Seller hereby discloses the profit margin to ensure transparency as per Shariah principles.`,
    },
    {
      id: 'default',
      title: 'Default and Penalties',
      required: false,
      content: () => `In case of late payment or default, the Buyer agrees to notify the Seller. No interest shall be charged.`,
    },
  ],
  Istisna: [
    {
      id: 'manufacturing',
      title: 'Manufactured Item Details',
      required: true,
      content: ({ fields }) => `The Manufacturer agrees to produce and deliver ${fields["Item to Manufacture"] || "__________"} meeting the agreed specifications.`,
    },
    {
      id: 'timeline',
      title: 'Timeline and Delivery',
      required: true,
      content: ({ fields }) => `The item shall be completed and delivered no later than ${fields["Delivery Date"] || "__________"}.`,
    },
    {
      id: 'payment_schedule',
      title: 'Payment Schedule',
      required: true,
      content: ({ fields }) => `Payments shall be made in the following phases: ${fields["Payment Schedule"] || "__________"}.`,
    },
    {
      id: 'quality',
      title: 'Specifications and Quality Standards',
      required: true,
      content: () => `The item shall adhere to the quality standards agreed upon in this contract.`,
    },
    {
      id: 'dispute',
      title: 'Dispute Resolution',
      required: false,
      content: () => `Any dispute shall be resolved amicably or through a Shariah-compliant arbitration process.`,
    },
  ],
  Salam: [
    {
      id: 'advance_payment',
      title: 'Advance Payment Terms',
      required: true,
      content: ({ fields }) => `The Buyer shall pay ${fields["Price Paid in Advance"] || "__________"} in advance for goods to be delivered on ${fields["Delivery Date"] || "__________"}.`,
    },
    {
      id: 'goods',
      title: 'Goods Description and Quantity',
      required: true,
      content: ({ fields }) => `The Seller agrees to deliver ${fields["Goods Description"] || "__________"} in the agreed quantity.`,
    },
    {
      id: 'delivery_terms',
      title: 'Delivery Time and Place',
      required: true,
      content: ({ fields }) => `The goods will be delivered on ${fields["Delivery Date"] || "__________"} at the agreed location.`,
    },
    {
      id: 'obligations',
      title: 'Seller Obligations',
      required: false,
      content: () => `The Seller is obligated to fulfill the contract with timely delivery and correct specifications.`,
    },
    {
      id: 'force_majeure',
      title: 'Force Majeure',
      required: false,
      content: () => `Neither Party shall be held liable for delays due to unforeseen circumstances beyond their control.`,
    },
  ],

  Employment: [
    {
      id: 'role',
      title: 'Job Role and Duties',
      required: true,
      content: ({ fields }) => `The Employee agrees to perform the duties of ${fields["Position"] || "__________"} as directed by the Employer.`,
    },
    {
      id: 'salary',
      title: 'Compensation and Benefits',
      required: true,
      content: ({ fields }) => `The Employee shall receive a monthly salary of ${fields["Salary"] || "__________"} plus applicable benefits.`,
    },
    {
      id: 'schedule',
      title: 'Working Hours and Schedule',
      required: true,
      content: () => `The Employee shall work as per the schedule mutually agreed in writing.`,
    },
    {
      id: 'leave',
      title: 'Leave Policy',
      required: false,
      content: () => `The Employee is entitled to paid annual and sick leave in accordance with company policy.`,
    },
    {
      id: 'termination',
      title: 'Termination Conditions',
      required: true,
      content: () => `Either Party may terminate this contract with prior written notice, or in case of breach.`,
    },
  ],


};


/* ✅ Clause Formatter */
function generateFormattedContract(type, fields) {
  const template = CONTRACT_CLAUSES[type];
  if (!template) return 'Invalid contract type selected.';

  const selectedClauses = template;

  const clauseText = selectedClauses
    .map((clause, index) => `${index + 1}. ${clause.title}\n${clause.content({ fields })}\n`)
    .join('\n');

  const header = `\n\nThis Agreement is entered into on ${fields["Agreement Date"] || new Date().toLocaleDateString() || "__________"} between:\n\n`;

  let parties = '';
  switch (type) {
    case 'NDA':
      parties = `Party A: ${fields["Party A"] || "__________"}\nParty B: ${fields["Party B"] || "__________"}\n\n`;
      break;
    case 'Freelance':
      parties = `Client: ${fields["Client Name"] || "__________"}\nFreelancer: _________________________\n\n`;
      break;
    case 'Partnership':
      parties = `Partner A: ${fields["Partner A"] || "__________"}\nPartner B: ${fields["Partner B"] || "__________"}\nBusiness Name: ${fields["Business Name"] || "__________"}\n\n`;
      break;
    case 'Mudarabah':
      parties = `Investor: ${fields["Investor Name"] || "__________"}\nEntrepreneur: ${fields["Entrepreneur Name"] || "__________"}\n\n`;
      break;
    case 'Musharakah':
      parties = `Partner A: ${fields["Partner A"] || "__________"}\nPartner B: ${fields["Partner B"] || "__________"}\n\n`;
      break;
    case 'QardHasan':
    case 'Loan':
      parties = `Lender: ${fields["Lender"] || fields["Lender Name"] || "__________"}\nBorrower: ${fields["Borrower"] || fields["Borrower Name"] || "__________"}\n\n`;
      break;
    case 'Ijarah':
      parties = `Lessor: ${fields["Lessor Name"] || "__________"}\nLessee: ${fields["Lessee Name"] || "__________"}\n\n`;
      break;
    case 'Wakalah':
      parties = `Principal: ${fields["Principal Name"] || "__________"}\nAgent: ${fields["Agent Name"] || "__________"}\n\n`;
      break;
    case 'Murabaha':
      parties = `Seller: ${fields["Seller Name"] || "__________"}\nBuyer: ${fields["Buyer Name"] || "__________"}\n\n`;
      break;
    case 'Istisna':
      parties = `Manufacturer: ${fields["Manufacturer"] || "__________"}\nBuyer: ${fields["Buyer"] || "__________"}\n\n`;
      break;
    case 'Salam':
      parties = `Buyer: ${fields["Buyer"] || "__________"}\nSeller: ${fields["Seller"] || "__________"}\n\n`;
      break;
    case 'Employment':
      parties = `Employer: ${fields["Employer Name"] || "__________"}\nEmployee: ${fields["Employee Name"] || "__________"}\n\n`;
      break;
    default:
      parties = `Party A: _________________________\nParty B: _________________________\n\n`;
  }

  const footer = `IN WITNESS WHEREOF, the parties have executed this Agreement:\n\nSignature of Party A: _________________________\n\nSignature of Party B: _________________________`;

  return `${header}${parties}${clauseText}\n${footer}`;
}


// 🔧 Utility: Check if new calendar month has started
const isNewMonth = (lastUsed) => {
  if (!lastUsed) return true;
  const now = new Date();
  const last = new Date(lastUsed);
  return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
};

// ✅ Contract Generation Endpoint
router.post('/generate', async (req, res) => {
  try {
    const { contractType, formData, userEmail = null } = req.body;

    let usage = { remaining: 0 };
    let user = null;

    // ✅ IF USER IS LOGGED IN
    if (userEmail) {
      const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [userEmail]);
      user = userRes.rows[0];

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (!user.is_premium) {
        let freeUses = user.free_uses;

        if (isNewMonth(user.last_used_at)) {
          freeUses = MAX_FREE_GENERATIONS;
          await pool.query(
            'UPDATE users SET free_uses = $1, last_used_at = NOW() WHERE email = $2',
            [MAX_FREE_GENERATIONS, userEmail]
          );
        }

        if (freeUses <= 0) {
          return res.status(403).json({
            success: false,
            remainingFreeUses: 0,
            error: 'You’ve used all your free contracts for this month.'
          });
        }

        await pool.query(
          'UPDATE users SET free_uses = free_uses - 1, last_used_at = NOW() WHERE email = $1',
          [userEmail]
        );

        usage.remaining = freeUses - 1;
      } else {
        usage.remaining = '∞';
      }

    } else {
      // ✅ Guest logic (frontend handles free_uses via localStorage)
      usage.remaining = null; // frontend tracks this
    }

    // ✅ Generate and log
    const formattedContract = generateFormattedContract(contractType, formData);

    await pool.query(
      'INSERT INTO contract_generations (contract_type, user_id) VALUES ($1, $2)',
      [contractType, user?.id || null]
    );

    res.json({
      success: true,
      remainingFreeUses: usage.remaining,
      contract: formattedContract,
      message: user?.is_premium ? 'Premium account!' : undefined
    });
  } catch (error) {
    console.error('❌ Error generating contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

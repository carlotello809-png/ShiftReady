/* ShiftReady — company world: Lumen & Co. (fictional online retailer)
   Policies, promotions, wrap-up codes, customer personas and the 5 training days. */
window.SR = window.SR || {};
SR.data = SR.data || {};
SR.data.scenarios = SR.data.scenarios || [];
SR.scenario = function (s) { SR.data.scenarios.push(s); };

SR.data.company = {
  name: 'Lumen & Co.',
  team: 'Customer Care · Chat',
  bot: 'Lumi',
  app: 'ShiftReady'
};

/* Wrap-up (disposition) codes — chosen by the agent after each chat */
SR.data.dispositions = [
  { id: 'order-status', label: 'Order / delivery status' },
  { id: 'order-change', label: 'Order details changed' },
  { id: 'cancellation', label: 'Order cancelled' },
  { id: 'return-exchange', label: 'Return or exchange set up' },
  { id: 'replacement', label: 'Replacement sent' },
  { id: 'refund', label: 'Refund or credit issued' },
  { id: 'billing', label: 'Billing / refund question' },
  { id: 'promo', label: 'Promotion or pricing help' },
  { id: 'membership', label: 'Membership change' },
  { id: 'account', label: 'Account access / security' },
  { id: 'product-info', label: 'Product information' },
  { id: 'tech-support', label: 'Troubleshooting' },
  { id: 'escalated', label: 'Escalated / referred' },
  { id: 'no-resolution', label: 'No resolution / customer left' }
];

/* How each type of customer behaves while waiting */
SR.data.personas = {
  calm: {
    label: 'Calm', decay: 0.75, typing: 1.1, replyIn: 22,
    nudges: ['Hello? 🙂', 'Are you still there?', 'I need to head out soon…'],
    leave: "I have to go now. I'll try again later."
  },
  neutral: {
    label: 'Neutral', decay: 1, typing: 1, replyIn: 16,
    nudges: ['Hello?', 'Is anyone there?', "I've been waiting quite a while now…"],
    leave: "Never mind. I'll contact you another time."
  },
  impatient: {
    label: 'Impatient', decay: 1.25, typing: 0.85, replyIn: 10,
    nudges: ['hello??', 'still waiting…', 'this is taking forever. last chance before I leave'],
    leave: 'forget it. bye.'
  },
  angry: {
    label: 'Upset', decay: 1.3, typing: 0.8, replyIn: 8,
    nudges: ['HELLO?', 'Unbelievable. Is anyone even there?', "I'm about to give up on you people."],
    leave: 'Done. Worst service ever.'
  },
  anxious: {
    label: 'Anxious', decay: 1.2, typing: 0.9, replyIn: 8,
    nudges: ['Hello?? Please, are you there?', 'Is someone looking into this?', 'Please answer, this is urgent…'],
    leave: "I'll call instead. This is too urgent to wait."
  }
};

/* Training days. decay = patience points lost per second while the customer waits on you. */
SR.data.days = [
  {
    n: 1, title: 'Orientation', date: '2026-11-02', level: 'Easy', decay: 0.45, patience: 'Relaxed',
    summary: 'A calm Monday to learn the basics. Customers are patient and the requests are simple — focus on tone and on reading the customer panel.',
    focus: ['Greeting customers and setting a friendly tone', 'Finding order details in the customer panel', 'Verifying guests before changing anything', 'Order status and cancellations'],
    tip: 'Before you reply, glance at the right panel. Many wrong answers sound polite but contain the wrong date, amount or status.'
  },
  {
    n: 2, title: 'Returns & Accounts', date: '2026-11-03', level: 'Easy', decay: 0.55, patience: 'Relaxed',
    summary: 'More customers, more variety: exchanges, a promo code, a broken delivery and a locked account. One chat was transferred to you mid-conversation.',
    focus: ['Exchanges and stock availability', 'Promotions and their conditions', 'Damaged items and replacements', 'Account security basics'],
    tip: 'When a chat is transferred to you, read the history first. Never make a customer repeat themselves.'
  },
  {
    n: 3, title: 'Billing & Delivery', date: '2026-11-04', level: 'Medium', decay: 0.8, patience: 'Normal',
    summary: 'Money questions and missing packages. Customers expect exact amounts and dates, and some will push back on policy.',
    focus: ['Pending charges and refunds', 'Packages marked delivered but not received', 'Price adjustments', 'Answering product questions accurately'],
    tip: 'Hold the policy line kindly: explain WHY a rule exists and give an exact date for the next step.'
  },
  {
    n: 4, title: 'Tough Customers', date: '2026-11-05', level: 'Hard', decay: 0.7, patience: 'Short',
    summary: 'Upset customers, requests outside policy and a possible account takeover. Patience runs out faster today.',
    focus: ['De-escalating upset customers', 'Saying no without losing the customer', 'When and how to escalate', 'Warranty troubleshooting'],
    tip: 'Acknowledge the feeling first, then act. Escalate only when policy says so — and always explain what happens next.'
  },
  {
    n: 5, title: 'Peak Friday', date: '2026-11-06', level: 'Expert', decay: 0.85, patience: 'Very short',
    summary: 'The busiest shift of the week. Seven customers, high stakes: lost packages, a safety incident, an abusive customer and privacy traps.',
    focus: ['Juggling seven chats at once', 'Safety incidents and urgent escalations', 'Handling abusive language professionally', 'Protecting customer privacy'],
    tip: 'Triage: answer the customer who has waited longest or whose issue is urgent (safety, security) first.'
  }
];

/* Knowledge base — company policy. Keys are referenced by scenarios. */
SR.data.policies = {
  conduct: {
    title: 'Communication standards', icon: 'chat',
    summary: 'Greet by name, empathize, be specific, never blame.',
    points: [
      'Greet the customer by name. Introduce yourself when you take over a chat.',
      'After a transfer, read the full history — never make the customer repeat themselves.',
      'Acknowledge feelings first, then act. Never blame the customer, the carrier or another team.',
      'Be specific: dates, amounts, order numbers and next steps. Never promise what you can’t control.',
      'Abusive language: give ONE respectful warning. If it continues, end the chat.',
      'Close by confirming the resolution and asking if there’s anything else.'
    ]
  },
  verification: {
    title: 'Identity verification', icon: 'shieldCheck',
    summary: 'Guests must be verified with two details before you share or change anything.',
    points: [
      'Customers in the mobile app, or signed in on web chat, are pre-verified (shown as “Verified” in Contact info).',
      'Guest chats must be verified with TWO of: email on file, order number, billing ZIP code, phone number on file.',
      'Never ask for passwords, full card numbers, security codes or one-time codes.',
      'If the account email was recently changed, verify with details from BEFORE the change (phone on file, billing ZIP).',
      'Only the account holder can view or change their account and orders. Someone calling for them (a partner, a relative) can’t be helped with that account — the holder can make the change in the app or contact us themselves.'
    ]
  },
  orders: {
    title: 'Cancellations & order changes', icon: 'box',
    summary: 'Free cancellation and address changes only while the order is Processing.',
    points: [
      'Orders can be cancelled free of charge while the status is Processing.',
      'Once an order has Shipped it can’t be cancelled — the customer can refuse delivery or return it after it arrives.',
      'The shipping address can be changed only while the order is Processing, and only after verification.',
      'Cancelled orders: the payment authorization is released to the original payment method within 3–5 business days.',
      'Single-use promo codes from a cancelled order are restored to the account within 24 hours.',
      'Shipping speed can’t be changed after an order has shipped.'
    ]
  },
  shipping: {
    title: 'Shipping & delivery', icon: 'truck',
    summary: 'Standard 5–7, Express 2–3, Next-day 1 business day. Never guarantee a delivery time.',
    points: [
      'Standard: 5–7 business days · $5.99 · free on orders over $50.',
      'Express: 2–3 business days · $14.99 · free for Lumen Plus members.',
      'Next-day: 1 business day · $24.99 · order before 2 PM.',
      'Business days are Monday–Friday. Weekends and holidays don’t count.',
      'If an Express or Next-day order arrives late (including carrier delays), refund the upgraded shipping fee.',
      'Orders may ship in several packages from different warehouses. Split shipments never cost extra.',
      'Delivery estimates come from the carrier — never guarantee an exact day or time.'
    ]
  },
  lost: {
    title: 'Missing & lost packages', icon: 'alert',
    summary: 'Wait 48h after a “delivered” scan. No movement for 5+ business days = lost.',
    points: [
      'Marked delivered but not received: ask the customer to check around the property, the mailroom / front desk and with neighbors.',
      'Wait 48 hours after the delivery scan before acting — packages are often scanned as delivered early.',
      'After 48 hours: open a carrier investigation and offer a replacement (if in stock) or a full refund — customer’s choice.',
      'No tracking movement for 5+ business days: treat the package as lost.',
      'Orders over $500: a replacement or refund requires supervisor approval → escalate.'
    ]
  },
  returns: {
    title: 'Returns & exchanges', icon: 'rotate',
    summary: '30 days (electronics 15). $6.95 fee for change-of-mind returns unless Lumen Plus.',
    points: [
      'Return window: 30 days from delivery for most items. Electronics (audio, wearables, smart home, computing): 15 days. Kitchen appliances: 30 days.',
      'Items must be unused, with tags or original packaging. Final-sale items (clearance, personalized) can’t be returned.',
      'Return shipping: $6.95 is deducted from the refund for change-of-mind returns. Free for Lumen Plus members and for damaged, defective or wrong items.',
      'Size / color exchanges are free (prepaid label) when the new size or color is in stock. The new item ships once the return is scanned by the carrier.',
      'Agents can’t make exceptions outside the return window. If the customer insists, escalate to a supervisor for review (no guaranteed outcome).'
    ]
  },
  refunds: {
    title: 'Refunds', icon: 'receipt',
    summary: 'Original payment method only. Banks take 5–7 business days to post refunds.',
    points: [
      'Refunds go to the original payment method only — never to a different card, account, or as cash.',
      'Refunds are processed within 2 business days of the return arriving at the warehouse. Banks take 5–7 business days to post them.',
      'If the original card was closed, the bank automatically redirects the refund to the customer’s new card or account. Give the refund reference so the bank can trace it.',
      'Never ask for card numbers in chat.'
    ]
  },
  damaged: {
    title: 'Damaged, defective & wrong items', icon: 'box',
    summary: 'Report within 7 days. Customer chooses replacement or refund. Replacement ships right away.',
    points: [
      'Must be reported within 7 days of delivery. Ask for a photo of the damage.',
      'The customer chooses: a replacement (if in stock) or a full refund.',
      'Replacements ship immediately — don’t wait for the return. Created before 2 PM = ships the same day with free Express shipping.',
      'If the customer needs it sooner (e.g., an event) and the issue was our error, you may upgrade the replacement to Next-day at no cost.',
      'Items under $25: the customer keeps the item, no return needed. Items $25 and over: email a prepaid return label (30 days to send it back).'
    ]
  },
  priceAdjust: {
    title: 'Price adjustments', icon: 'tag',
    summary: 'Our price dropped within 14 days? Refund the difference. No competitor price matching.',
    points: [
      'If a Lumen & Co. price drops within 14 days of purchase, refund the difference (plus tax) once per item to the original payment method. No return needed.',
      'We don’t match other retailers’ prices.',
      'Not available on Lightning Deals.'
    ]
  },
  promotions: {
    title: 'Promotions & promo codes', icon: 'tag',
    summary: 'One code per order. Agents can’t apply, extend or override codes.',
    points: [
      'One promo code per order. Codes can’t be added to orders that were already placed.',
      'Agents can’t apply, extend or override promo codes manually.',
      'Single-use codes from a cancelled order are restored within 24 hours.'
    ],
    table: {
      head: ['Code', 'Offer', 'Conditions', 'Valid'],
      rows: [
        ['WELCOME10', '10% off', 'First order of a new account', 'Ongoing'],
        ['FALL20', '20% off Home & Bath', 'Minimum $75 of Home & Bath items', 'Oct 26 – Nov 8'],
        ['FREESHIP', 'Free Express shipping', 'Orders over $100', 'Ended Oct 31'],
        ['PLUS15', '15% off one order', 'Lumen Plus members only', 'Nov 1 – Nov 30']
      ]
    }
  },
  goodwill: {
    title: 'Goodwill credits', icon: 'gift',
    summary: 'Up to $10 store credit for service failures. More needs a supervisor.',
    points: [
      'For a service failure caused by us or the carrier (late delivery, our mistake) you may add up to $10 store credit.',
      '$10–$25 requires supervisor approval. Never use refunds or cash as goodwill.',
      'Goodwill is not used to waive standard policy fees (for example the $6.95 return fee).'
    ]
  },
  warranty: {
    title: 'Warranty & tech support', icon: 'shieldCheck',
    summary: '1-year warranty on electronics. Troubleshoot first, then replace.',
    points: [
      'Electronics have a 1-year limited warranty from the delivery date, covering manufacturing defects (not accidental damage).',
      'Always troubleshoot first: check known issues and the software version, then restart or reset.',
      'If still defective: Lumen & Co. handles the warranty replacement — prepaid label, and the new unit ships when the defective one is received. Lumen Plus members get an advance replacement.',
      'We handle warranty claims for products we sell — don’t send customers to the manufacturer.'
    ]
  },
  membership: {
    title: 'Lumen Plus membership', icon: 'award',
    summary: '$9.99/mo or $79/yr. Full refund within 14 days of renewal if no benefits used.',
    points: [
      '$9.99 per month or $79 per year. Benefits: free Express shipping, free returns, early access to sales.',
      'A reminder email is sent 7 days before an annual renewal.',
      'Annual renewal: full refund if cancelled within 14 days of the renewal charge AND no Plus benefits were used since. Otherwise the membership stays active until the end of the term.',
      'When a refund is issued, Plus benefits end immediately. The account, order history and addresses are not affected.',
      'One light, personalized retention offer is allowed (e.g., the monthly plan). If the customer says no, cancel without pressure.'
    ]
  },
  accounts: {
    title: 'Account access & security', icon: 'lock',
    summary: 'Never handle passwords. Unlock + reset link. Takeovers go to Trust & Safety.',
    points: [
      'Never ask for, set or share a password. After verification, unlock the account and send a password-reset link to the email on file (valid 30 minutes).',
      'Accounts lock after 5 failed sign-ins and can’t use self-service reset — the agent must unlock them.',
      'Agents can’t change an account’s email address in chat.',
      'Suspected account takeover (unrecognized password/email change, unknown orders): verify with pre-change details, then escalate to Trust & Safety. The account is locked immediately and suspicious unshipped orders are cancelled. T&S contacts the customer within 2 hours.',
      'Customers add payment methods themselves (Account › Payment methods).'
    ]
  },
  payments: {
    title: 'Payments & billing', icon: 'card',
    summary: 'Charged when the order ships. Failed attempts may show as pending 3–5 business days.',
    points: [
      'Customers are charged when the order ships. At checkout we place an authorization hold.',
      'Failed or voided payment attempts can show as “pending” for 3–5 business days, depending on the bank. They are never captured.',
      'Agents can’t speed up a bank’s release of a hold. The customer may call their bank and say the authorization was voided by the merchant.'
    ]
  },
  safety: {
    title: 'Product safety', icon: 'shieldAlert',
    summary: 'Safety first. Unplug, keep the item, escalate urgently, full refund.',
    points: [
      'Any report of injury, fire, smoke, sparks, melting or a burning smell is a safety incident.',
      'FIRST make sure the customer is safe: stop using the product and unplug it (or switch off the breaker) if it’s safe to do so. Active fire or smoke → call 911.',
      'Escalate immediately to Product Safety (urgent — they contact the customer within 4 hours).',
      'Ask the customer to KEEP the product. Product Safety arranges a free pickup. Never ask them to ship it.',
      'Full refund regardless of the return window. Never speculate about the cause.'
    ]
  },
  escalation: {
    title: 'Escalation guide', icon: 'flag',
    summary: 'Who handles what, and how fast. Never promise the outcome.',
    points: [
      'Supervisor — customer asks for a manager after you tried to help; exception requests; refunds or replacements over $500; chargeback or legal threats. Replies by email within 24 hours.',
      'Trust & Safety — suspected fraud or account takeover. Contacts the customer within 2 hours.',
      'Product Safety — injury, fire, smoke, sparks. Contacts the customer within 4 hours.',
      'Lumen for Business — 20+ units of an item, tax-exempt purchases, invoicing. Replies within 1 business day.',
      'Always tell the customer who will contact them, how, and when. Never promise the outcome.'
    ]
  },
  business: {
    title: 'Lumen for Business', icon: 'users',
    summary: '20+ units, volume pricing, invoicing and tax-exempt orders.',
    points: [
      'Handles orders of 20+ units of an item, volume pricing, net-30 invoicing and tax-exempt purchases (exemption certificate required).',
      'Create a referral with the company name, contact email and any deadline. A specialist replies within 1 business day. Phone: 1-800-555-0199.',
      'Agents can’t apply tax exemptions or business pricing.'
    ]
  },
  gifts: {
    title: 'Gift orders', icon: 'gift',
    summary: 'Recipients return with the gift receipt code. Purchaser details stay private.',
    points: [
      'Gift recipients can return or exchange with the gift receipt code (GR-…) — no account needed.',
      'Refunds for gift returns are issued as a Lumen e-gift card to the recipient.',
      'The purchaser is NOT notified about gift returns or exchanges.',
      'Never share purchaser details, the price paid or payment information with the recipient.'
    ]
  }
};

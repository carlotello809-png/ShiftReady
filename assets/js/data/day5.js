/* DAY 5 — Peak Friday (Fri, Nov 6, 2026) */

SR.scenario({
  id: 'd5-michael', day: 5, arrive: 0, replyIn: 10, persona: 'angry', patience: 66,
  channel: 'web', verified: true, verifyNote: 'Signed in on lumenco web', priority: 'High',
  topic: 'Lost package — 3rd contact', disp: ['escalated'],
  customer: {
    first: 'Michael', last: 'Russo', photo: 'men/36', location: 'Hoboken, New Jersey',
    email: 'mike.russo@gmail.com', phone: '+1 (201) 555-0190', since: '2020-09-15',
    plan: 'Lumen Plus', ltv: '$4,980.00', orders: 38, tags: ['Lumen Plus', 'VIP', 'Repeat contact']
  },
  sections: [
    {
      title: 'Order LM-481100', icon: 'box', rows: [
        ['Status', { pill: 'In transit — no movement', tone: 'danger' }],
        ['Placed', { date: '2026-10-20' }],
        { items: [{ name: 'Nova 4K Projector', meta: 'White · Qty 1', price: '$599.00', stock: 'In stock · 14 units', tone: 'success' }] },
        ['Shipping', 'Express · Free (Lumen Plus)'],
        ['Tax', '$39.68'],
        ['Total', { strong: '$638.68' }],
        ['Payment', 'Visa •••• 7302']
      ]
    },
    {
      title: 'Shipment', icon: 'truck', rows: [
        ['Carrier', 'FedEx'],
        ['Tracking', { mono: '612003948875' }],
        ['Shipped', { date: '2026-10-21' }],
        ['Last scan', { date: '2026-10-23' }],
        ['Last location', 'In transit — Edison, NJ'],
        ['Carrier trace', 'TR-88120 · opened Oct 29'],
        ['Trace status', { pill: 'No response', tone: 'warning' }]
      ]
    }
  ],
  timeline: [
    ['Oct 20', 'Order placed'],
    ['Oct 21', 'Shipped with FedEx', 'info'],
    ['Oct 23', 'Last scan — Edison, NJ', 'info'],
    ['Oct 26', 'Customer contact #1 — told to wait', 'warning'],
    ['Oct 29', 'Customer contact #2 — FedEx trace opened', 'warning'],
    ['Nov 6', 'Customer contact #3 (now)', 'danger']
  ],
  policies: ['lost', 'escalation', 'conduct'],
  notes: [
    'Oct 26 — Customer asked for a tracking update. Advised to wait. (Agent: Nina S.)',
    'Oct 29 — FedEx trace TR-88120 opened. Promised an update in 3–5 business days. (Agent: Sam R.)'
  ],
  start: 'start',
  nodes: {
    start: {
      c: ["This is the THIRD time I'm contacting you about my projector.", "$640 and nobody can tell me where it is. If this isn't fixed today I'm disputing the charge with my bank."],
      o: [
        { q: 3, t: "Hi Michael, I'm {agent}. I'm really sorry — you shouldn't have had to contact us three times. I've read the notes: your projector hasn't had a tracking update since Oct 23, and the FedEx trace opened on Oct 29 still has no answer. With no movement for more than 5 business days, we treat it as lost. Let's resolve this now.", go: 'options', fb: 'Owns the repeated failure, proves you read the history, and applies the lost-package rule.' },
        { q: 0, t: "Disputing the charge won't help you get it any faster.", retry: true, r: ['Is that a threat?'], fb: "Don't get defensive. Acknowledge the repeated contacts and show you know the history." },
        { q: 2, t: "I'm sorry for the trouble. Let me check the tracking.", go: 'options', fb: "Fine, but he's contacted us 3 times — show you've read the notes so he doesn't repeat himself." },
        { q: 1, t: 'We opened a trace on Oct 29. Please wait for FedEx to respond.', retry: true, r: ["I've waited a WEEK. I'm done waiting."], fb: "No movement for 5+ business days = lost. Don't make him wait longer." }
      ]
    },
    options: {
      c: ['So what are you going to do about it?'],
      o: [
        { q: 3, t: "Because the order is over $500, the replacement or refund needs supervisor approval — so I'm escalating it right now as a priority case, with everything documented. A supervisor will contact you within 24 hours to confirm either a replacement (it's in stock) or a full refund of $638.68 — your choice. Which would you prefer, so I can note it?", go: 'pref', fb: 'Correct escalation rule (over $500), clear options, a timeframe, and you capture his preference.' },
        { q: 0, t: "I'll send you a replacement projector right now.", retry: true, r: ['Finally! Wait… the last agent said someone else had to approve big orders. Is this actually happening?'], fb: 'Orders over $500 need supervisor approval. Promising it yourself sets up another broken promise.' },
        { q: 1, t: 'We need to wait for the FedEx trace to finish first.', retry: true, r: ["NO. It's been two weeks."], fb: "The package already qualifies as lost — waiting longer isn't the answer." },
        { q: 2, t: "I'll escalate this to my supervisor for approval.", go: 'pref', fb: 'Correct step. Give him the timeline and his options so he knows exactly what happens next.' }
      ]
    },
    pref: {
      c: ["A refund. I'll just buy it somewhere else.", "And 24 more hours? Seriously? I'll just do the chargeback."],
      o: [
        { q: 3, t: "I understand, and you're free to contact your bank — but a chargeback can take 60–90 days and may temporarily restrict your account. Going through us is much faster: once approved within 24 hours, the refund is issued immediately. I've noted 'refund' as your preference and marked case ESC-55190 as urgent.", go: 'final', fb: 'Respects his right, explains the trade-off honestly (no threats), and shows the faster path.' },
        { q: 0, t: "If you file a chargeback, we'll have to close your account.", retry: true, r: ['Wow. Threatening your customers now?'], fb: 'Never threaten. Explain the trade-offs neutrally.' },
        { q: 1, t: "Okay, that's your choice.", go: 'final_cold', fb: "Doesn't explain that our refund is faster than a dispute. Help him choose the best path." }
      ]
    },
    final: {
      c: ["…fine. 24 hours. If I don't hear back I'm calling the bank."],
      o: [
        { q: 3, t: "That's fair. You'll hear from a supervisor by this time tomorrow at the latest. I'm sorry again for the experience, Michael. Is there anything else I can help with?", go: 'end', fb: 'Accepts his condition, restates the deadline and apologizes sincerely.' },
        { q: 2, t: 'Understood. Anything else?', go: 'end', fb: 'OK. A sincere apology fits a 3rd contact.' }
      ]
    },
    final_cold: {
      c: ['Whatever. Just get it done.'],
      o: [
        { q: 3, t: "Absolutely. Case ESC-55190 is marked urgent, and a supervisor will contact you within 24 hours to process your refund. I'm sorry again for the experience.", go: 'end', fb: 'Recovers with a clear commitment.' },
        { q: 1, t: 'Ok.', go: 'end_cold', fb: "He needs a firm commitment, not 'ok'." }
      ]
    },
    end: { c: ['No. Just get it done, please.'], end: 'resolved' },
    end_cold: { c: ['Unbelievable.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd5-hannah', day: 5, arrive: 8, replyIn: 8, persona: 'calm',
  channel: 'app', verified: true, priority: 'Low',
  topic: 'Refund to a closed card', disp: ['billing'],
  customer: {
    first: 'Hannah', last: 'Schmidt', photo: 'women/52', location: 'Portland, Maine',
    email: 'hannah.schmidt@gmail.com', phone: '+1 (207) 555-0114', since: '2022-05-06',
    plan: 'Standard', ltv: '$812.40', orders: 10, tags: []
  },
  sections: [
    {
      title: 'Order LM-480210', icon: 'box', rows: [
        ['Status', { pill: 'Returned', tone: 'neutral' }],
        ['Placed', { date: '2026-10-12' }],
        ['Delivered', { date: '2026-10-16' }],
        { items: [{ name: 'Quilted Rain Jacket', meta: 'Slate Gray · Size M · Qty 1', price: '$112.00' }] },
        ['Tax', '$6.16'],
        ['Total paid', { strong: '$118.16' }],
        ['Paid with', 'Visa •••• 7741']
      ]
    },
    {
      title: 'Return & refund', icon: 'rotate', rows: [
        ['Reason', 'Defective — zipper broken (fee waived)'],
        ['Received at warehouse', { date: '2026-11-03' }],
        ['Refund processed', { date: '2026-11-05' }],
        ['Refund amount', { strong: '$118.16' }],
        ['Refunded to', 'Visa •••• 7741'],
        ['Refund reference', { mono: 'RF-23041' }]
      ]
    },
    {
      title: 'Payment methods', icon: 'card', rows: [
        ['Visa •••• 7741', { pill: 'Removed Oct 29 — reported lost', tone: 'danger' }],
        ['Mastercard •••• 6020', { pill: 'Default · added Oct 30', tone: 'success' }],
        ['PayPal', 'Not linked']
      ]
    }
  ],
  timeline: [
    ['Oct 16', 'Delivered', 'success'],
    ['Oct 29', 'Visa •••• 7741 removed by customer', 'warning'],
    ['Nov 3', 'Return received at warehouse', 'info'],
    ['Nov 5', 'Refund processed — $118.16 to Visa •••• 7741', 'success']
  ],
  policies: ['refunds', 'accounts'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hi! I returned a jacket and got an email that my refund was processed 🙂', 'Problem is, that Visa was cancelled last week because I lost it. Can you send the money to my new card instead?'],
      o: [
        { q: 3, t: "Hi Hannah! I see the refund of $118.16 was processed yesterday to your Visa ending in 7741. Sorry about the lost card! Refunds can only go back to the original payment method, but don't worry — when a card is closed, your bank automatically sends the refund to your new card or account once it arrives.", go: 'unsure', fb: 'Accurate, reassuring, and explains what will actually happen to her money.' },
        { q: 0, t: "Sure! Just send me the new card number and I'll redirect the refund.", retry: true, r: ['Ok… do you need the whole number here in the chat?'], fb: "Never ask for card numbers in chat — and refunds can't be redirected to a different card." },
        { q: 1, t: 'Sorry, we can only refund to the original card.', go: 'unsure', r: ['So… my money is just gone?? 😟'], fb: 'Correct but incomplete. Explain that the bank redirects refunds for closed cards.' },
        { q: 0, t: "No problem — I'll cancel that refund and send it as store credit instead.", retry: true, r: ["Oh, can you? Wait, isn't it already processed?"], fb: "The refund was already processed — it can't be pulled back. Her bank will route it to her new card." }
      ]
    },
    unsure: {
      c: ['Are you sure the bank will do that? What if they don\'t?'],
      o: [
        { q: 3, t: "It's very standard — the refund is tied to your account with the bank, not the plastic card. If you don't see it by Nov 16, contact your bank with the refund reference RF-23041 and they can trace it. And if they can't find it, message us and we'll help investigate.", go: 'paypal', fb: 'Explains why, gives a "by" date and the reference, plus a safety net.' },
        { q: 0, t: "If they don't, we'll just send it again to your new card.", retry: true, r: ['Oh, so you CAN send it to the new card? Why not just do that now then?'], fb: "Don't promise a duplicate refund. The refund reference lets her bank trace it." },
        { q: 2, t: "Yes, banks do that. Contact them if you don't see it within 7 business days.", go: 'paypal', fb: 'Give her the refund reference (RF-23041) so the bank can trace it quickly.' }
      ]
    },
    paypal: {
      c: ['Ok. And for future orders, can I add PayPal to my account?'],
      o: [
        { q: 3, t: "Yes! In the app go to Account › Payment methods › Add PayPal. You'll be redirected to PayPal to sign in and confirm. For security I can't add it for you, but it only takes a minute.", go: 'close', fb: 'Clear steps and explains why you can\'t do it for her.' },
        { q: 0, t: "Sure, send me your PayPal email and password and I'll set it up for you.", retry: true, r: ['My password?? 😳 Is that normal?'], fb: 'Never ask for passwords. Customers add payment methods themselves.' },
        { q: 2, t: 'Yes, you can add it under Account › Payment methods.', go: 'close', fb: 'Correct and short.' }
      ]
    },
    close: {
      c: ['Got it. Thanks for explaining everything!'],
      o: [
        { q: 3, t: "You're welcome, Hannah! Anything else I can help you with today?", go: 'end', fb: 'Proper close.' },
        { q: 2, t: 'No problem, have a good day!', go: 'end', fb: "Fine — ask if there's anything else." }
      ]
    },
    end: { c: ["Nope, that's all 😊"], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd5-samuel', day: 5, arrive: 25, replyIn: 16, persona: 'calm',
  channel: 'web', verified: 'na', verifyNote: 'Guest · pre-sales (no account data needed)', priority: 'Medium',
  topic: 'Bulk order for an office', disp: ['escalated', 'product-info'],
  customer: {
    first: 'Samuel', last: 'Ortiz', photo: 'men/58', location: 'Dallas, Texas',
    email: 's.ortiz@ridgelineoffices.com', phone: '+1 (214) 555-0170', since: null,
    plan: 'Guest', ltv: '—', orders: 0, tags: ['Business lead']
  },
  sections: [
    {
      title: 'Product viewed', icon: 'tag', rows: [
        { items: [{ name: 'Ergo Mesh Office Chair', meta: 'Black · ★ 4.6 (1,204 reviews)', price: '$289.00', stock: '9 units online · max 10 per order', tone: 'warning' }] },
        ['Restock', '60 units expected Nov 20 (Reno warehouse)'],
        ['Delivery', 'Standard 5–7 business days · free']
      ]
    },
    {
      title: 'Lumen for Business', icon: 'users', rows: [
        { note: '20+ units of one item → Lumen for Business: volume pricing, net-30 invoicing, tax-exempt orders. Create a referral — a specialist replies within 1 business day.', tone: 'info' },
        ['Phone', '1-800-555-0199 (Mon–Fri)'],
        ['Tax exemption', 'Certificate required · applied by Business team only']
      ]
    }
  ],
  timeline: [
    ['Nov 6 · 9:10 AM', 'Viewed Ergo Mesh Office Chair'],
    ['Nov 6 · 9:11 AM', 'Tried to add 40 to cart — limited to 9', 'warning'],
    ['Nov 6 · 9:12 AM', 'Opened chat from product page']
  ],
  policies: ['business', 'escalation', 'promotions'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Good morning. I manage an office in Dallas and we're looking to buy 40 of the Ergo Mesh chairs.", 'Is there a discount for that quantity? And can we pay by invoice?'],
      o: [
        { q: 3, t: 'Good morning, Samuel — thanks for considering us! Orders of 20+ units are handled by our Lumen for Business team: they offer volume pricing and invoicing with net-30 terms. I can set up a referral so a specialist contacts you directly. Could I get your company name and the best email to reach you?', go: 'details', fb: 'Right team, explains the benefits, and offers a warm referral.' },
        { q: 0, t: 'Sure! Just add 40 to your cart and use code WELCOME10 for 10% off.', retry: true, r: ['10% on 40 chairs? I was hoping for a proper business quote. And is that code even meant for this?'], fb: "WELCOME10 is for a first order only and isn't bulk pricing. 20+ units go to Lumen for Business." },
        { q: 2, t: 'Hi! Bulk orders are handled by our business team. You can call them at 1-800-555-0199.', go: 'details', r: ["Can't you pass my details on to them? I'm between meetings."], fb: 'Right team — but a warm referral is better than making a busy customer call.' }
      ]
    },
    details: {
      c: ['Ridgeline Offices — s.ortiz@ridgelineoffices.com', 'Also, do you actually have 40 in stock? We need them by the end of the month.'],
      o: [
        { q: 3, t: 'Thank you! Right now we have 9 in stock online, with 60 more expected on Nov 20. The Business team can reserve units from that restock, so they\'ll confirm whether all 40 can be delivered by the end of November. I\'ve added your deadline to the referral.', go: 'tax', fb: 'Honest stock info, uses the restock date, and records his deadline.' },
        { q: 0, t: 'Yes, we have plenty in stock — no problem at all.', retry: true, r: ['Great — 40 though? The website only lets me add 9 to the cart.'], fb: "Stock shows 9 units online. Never confirm availability you can't see." },
        { q: 1, t: 'No, we only have 9.', go: 'tax', r: ["Hmm, that's a problem then…"], fb: 'Accurate, but mention the restock (60 units on Nov 20) and that the Business team can reserve them.' }
      ]
    },
    tax: {
      c: ["Ok, great. And we're tax-exempt — is that something they can handle?"],
      o: [
        { q: 3, t: 'Yes — the Business team handles tax-exempt purchases; just have your exemption certificate ready. I\'ve created referral BIZ-10442, and a specialist will email you at s.ortiz@ridgelineoffices.com within 1 business day.', go: 'close', fb: 'Complete: what to prepare, a reference, who contacts him and when.' },
        { q: 0, t: "Sure, I'll remove the sales tax for you from here.", retry: true, r: ["From the chat? Don't you need our certificate?"], fb: "Agents can't apply tax exemptions — the Business team verifies the certificate." },
        { q: 2, t: "Yes, they can. They'll contact you within 1 business day.", go: 'close', fb: 'Correct. Mention the certificate and give a referral number.' }
      ]
    },
    close: {
      c: ['Excellent. Thank you for your help.'],
      o: [
        { q: 3, t: 'My pleasure, Samuel. Is there anything else I can help you with today?', go: 'end', fb: 'Professional close.' },
        { q: 2, t: 'You\'re welcome, have a great day.', go: 'end', fb: 'Fine.' }
      ]
    },
    end: { c: ["That's all. Have a good day."], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd5-patricia', day: 5, arrive: 45, replyIn: 8, persona: 'anxious',
  channel: 'app', verified: true, priority: 'Urgent',
  topic: 'Heater sparked — safety', disp: ['escalated'],
  customer: {
    first: 'Patricia', last: 'Lewis', photo: 'women/71', location: 'Cleveland, Ohio',
    email: 'patricia.lewis@yahoo.com', phone: '+1 (216) 555-0129', since: '2019-11-20',
    plan: 'Standard', ltv: '$2,210.65', orders: 30, tags: ['Customer since 2019']
  },
  sections: [
    {
      title: 'Order LM-480660', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-15' }],
        ['Delivered', { date: '2026-10-19' }],
        { items: [{ name: 'Hearth 1500W Ceramic Space Heater', meta: 'White · Qty 1 · Home appliance', price: '$69.99' }] },
        ['Tax', '$5.60'],
        ['Total', { strong: '$75.59' }],
        ['Payment', 'Discover •••• 3021']
      ]
    },
    {
      title: 'Product safety', icon: 'shieldAlert', rows: [
        { note: 'Product Safety review PS-2026-114 open: 3 reports of sparking at the power-cord connection.', tone: 'danger' },
        ['Escalation', 'Product Safety · urgent · contact within 4 hours'],
        ['Pickup', 'Arranged by Product Safety — free']
      ]
    }
  ],
  timeline: [
    ['Oct 15', 'Order placed'],
    ['Oct 19', 'Delivered', 'success'],
    ['Nov 2', 'Safety review PS-2026-114 opened for this model', 'danger']
  ],
  policies: ['safety', 'escalation'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hi, the space heater I bought from you just made a popping sound and there were sparks where the cord goes in!!', 'It smells like something burned'],
      o: [
        { q: 3, t: "Patricia, first — are you and everyone at home okay? Please unplug the heater if it's safe to do so (or switch off the breaker), keep it away from anything flammable, and don't use it again. If you see smoke or fire, call 911.", go: 'safe', fb: 'Safety first, always. Before anything else, make sure the customer is safe.' },
        { q: 0, t: "I'm sorry to hear that! Would you like a return or an exchange?", retry: true, r: ["I don't know, I'm still shaking. Should I unplug it???"], fb: 'Safety comes before solutions. Give safety instructions immediately.' },
        { q: 1, t: 'Could you send a photo of the heater and the cord so I can take a look?', retry: true, r: ["A photo?? It just sparked, I'm scared to go near it!"], fb: "Photos can wait. First make sure she's safe and the device is unplugged." }
      ]
    },
    safe: {
      c: ["Yes, we're okay. I unplugged it from the wall.", "There's a black mark on the plug."],
      o: [
        { q: 3, t: "I'm so glad you're safe. I'm escalating this right now to our Product Safety team as an urgent case — they'll contact you within 4 hours. Please keep the heater and don't throw it away; they'll arrange a free pickup to investigate. You'll also receive a full refund.", go: 'refund', fb: 'Urgent escalation, timeline, keep the product, free pickup and refund — all per policy.' },
        { q: 0, t: 'Please ship it back to us in the original box so we can inspect it.', retry: true, r: ["Ship it? I don't even want to touch it…"], fb: 'Never ask the customer to ship a hazardous item. Product Safety arranges the pickup.' },
        { q: 0, t: "It's probably a problem with your wall outlet, not the heater.", retry: true, r: ["My outlet?? It's the heater that sparked!"], fb: 'Never speculate about the cause or blame the customer. Escalate to Product Safety.' },
        { q: 2, t: "Thank you. I'm escalating this to our Product Safety team.", go: 'refund', fb: 'Correct. Tell her the timeline, to keep the heater, and that a refund is coming.' }
      ]
    },
    refund: {
      c: ['Ok. Do I get my money back even though I bought it 3 weeks ago?'],
      o: [
        { q: 3, t: "Yes — for safety issues the return window doesn't matter. You'll get a full refund of $75.59 to your Discover card, and the safety team will confirm it when they contact you. Your case number is PS-77812.", go: 'close', fb: 'Exact amount, card and a case number.' },
        { q: 0, t: "Unfortunately heaters only have a 15-day return window, so it's past that.", retry: true, r: ['What?! It almost caught fire!'], fb: 'Safety issues get a full refund regardless of the return window.' },
        { q: 2, t: "Yes, you'll get a full refund.", go: 'close', fb: 'Correct. The amount and a case number would add confidence.' }
      ]
    },
    close: {
      c: ['Thank you. I was really scared.'],
      o: [
        { q: 3, t: "Of course — you did exactly the right thing. If you notice any smoke or the burning smell gets stronger, call 911 first. Our safety team will reach out within 4 hours. Is there anything else I can do for you?", go: 'end', fb: 'Empathetic, repeats the key safety instruction and closes properly.' },
        { q: 2, t: 'I understand. The safety team will contact you soon. Anything else?', go: 'end', fb: 'Fine. Repeating the 911 instruction is a good safety habit.' }
      ]
    },
    end: { c: ['No, thank you for helping me.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd5-kyle', day: 5, arrive: 70, replyIn: 8, persona: 'angry', patience: 62,
  channel: 'messenger', verified: true, verifyNote: 'Messenger linked to account', priority: 'Medium',
  topic: 'Where is my headset?', disp: ['order-status'],
  customer: {
    first: 'Kyle', last: 'Thompson', photo: 'men/28', location: 'Las Vegas, Nevada',
    email: 'kyle.t702@gmail.com', phone: '+1 (702) 555-0186', since: '2025-08-03',
    plan: 'Standard', ltv: '$164.98', orders: 2, tags: []
  },
  sections: [
    {
      title: 'Order LM-483002', icon: 'box', rows: [
        ['Status', { pill: 'Shipped', tone: 'info' }],
        ['Placed', { date: '2026-11-01' }],
        { items: [{ name: 'X7 Gaming Headset', meta: 'Black & Red · Qty 1', price: '$89.99' }] },
        ['Shipping', 'Standard (5–7 business days) · Free'],
        ['Tax', '$7.54'],
        ['Total', { strong: '$97.53' }],
        ['Payment', 'Debit card •••• 4410']
      ]
    },
    {
      title: 'Shipment', icon: 'truck', rows: [
        ['Carrier', 'USPS Ground Advantage'],
        ['Tracking', { mono: '9400111899223344556677' }],
        ['Shipped', { date: '2026-11-03' }],
        ['Est. delivery', { date: '2026-11-09' }],
        ['Upgrade possible?', { pill: 'No — already shipped', tone: 'neutral' }]
      ]
    }
  ],
  timeline: [
    ['Nov 1 (Sun)', 'Order placed'],
    ['Nov 3', 'Shipped with USPS', 'info'],
    ['Nov 5', 'In transit — Phoenix, AZ', 'info']
  ],
  policies: ['conduct', 'shipping', 'orders'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['where the hell is my headset', 'you people are useless. ordered it on sunday'],
      o: [
        { q: 3, t: "Hi Kyle, I'm {agent} and I'll help you with your headset. I can see order LM-483002 — it shipped on Nov 3 with standard shipping, and the estimated delivery is Monday, Nov 9.", go: 'insult', fb: "Stays calm, doesn't react to the tone, and leads with facts." },
        { q: 1, t: "Please don't speak to me like that or I'll end this chat.", retry: true, r: ['lol whatever. just tell me where it is'], fb: "Frustration isn't a personal insult yet — help first. Save the formal warning for direct insults." },
        { q: 1, t: 'Sorry for the wait! Let me check that for you.', retry: true, r: ['hurry up'], fb: "He wants answers fast. Lead with the facts — they're right there in the panel." }
      ]
    },
    insult: {
      c: ['MONDAY?? are you stupid or what?', 'I need it for a tournament this weekend'],
      o: [
        { q: 3, t: "I want to help you, Kyle, and I understand you're frustrated — but please keep the conversation respectful, or I'll have to end the chat. Now, let's see what we can do about the weekend.", go: 'apology', fb: 'Clear, respectful boundary (one warning, per policy), then back to solving.' },
        { q: 0, t: "No, I'm not stupid — maybe read the shipping options next time.", go: 'fight', fb: 'Never respond to insults in kind. It is unprofessional and escalates the conflict.' },
        { q: 1, t: 'Ok.', retry: true, r: ['ok WHAT?? can you make it faster or not'], fb: "Ignoring a direct insult isn't ideal — policy says give one respectful warning." },
        { q: 0, t: 'This chat is being closed due to abusive language.', go: 'cut', fb: 'Too fast — policy says give ONE respectful warning before ending the chat.' }
      ]
    },
    apology: {
      c: ['…fine. sorry.', "it's just that I've been waiting for this tournament for months. can you make it faster?"],
      o: [
        { q: 3, t: "No worries, I get it! Since it's already shipped, I can't change the shipping speed — but standard deliveries sometimes arrive early, and you'll get a notification the moment it's out for delivery.", go: 'close', fb: "Honest about what can't be done, no false promises, still positive." },
        { q: 0, t: "Sure, I'll upgrade it to Next-day delivery for you.", retry: true, r: ['wait really? it already shipped tho'], fb: "Once shipped, the shipping speed can't be changed." },
        { q: 2, t: "Sorry, it already shipped, so I can't speed it up.", go: 'close', fb: 'Correct. A little warmth helps now that he apologized.' }
      ]
    },
    close: {
      c: ["ok. guess I'll wait. thanks"],
      o: [
        { q: 3, t: "You're welcome, Kyle — good luck in the tournament! Anything else I can help with?", go: 'end', fb: 'Ends on a positive, personal note.' },
        { q: 2, t: 'No problem.', go: 'end_short', fb: 'Fine.' }
      ]
    },
    fight: { c: ['wow. reported. bye'], end: 'unresolved' },
    cut: { c: [], sys: 'You ended the chat', end: 'unresolved' },
    end: { c: ['nah thx'], end: 'resolved' },
    end_short: { c: ['👍'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd5-megan', day: 5, arrive: 100, replyIn: 18, persona: 'neutral',
  channel: 'web', verified: true, verifyNote: 'Signed in on lumenco web', priority: 'Low',
  topic: 'Item missing from my order', disp: ['order-status'],
  customer: {
    first: 'Megan', last: 'Price', photo: 'women/26', location: 'Charlotte, North Carolina',
    email: 'megan.price@outlook.com', phone: '+1 (704) 555-0158', since: '2023-06-15',
    plan: 'Lumen Plus', ltv: '$1,560.00', orders: 19, tags: ['Lumen Plus']
  },
  sections: [
    {
      title: 'Order LM-482420', icon: 'box', rows: [
        ['Status', { pill: 'Partially delivered', tone: 'warning' }],
        ['Placed', { date: '2026-10-30' }],
        ['Shipping', 'Express · Free (Lumen Plus) · 2 packages'],
        ['Tax', '$7.76'],
        ['Total', { strong: '$114.76' }],
        ['Payment', 'Visa •••• 5528']
      ]
    },
    {
      title: 'Shipment 1 of 2 — Atlanta, GA', icon: 'truck', rows: [
        { items: [{ name: 'Linen Throw Pillow Cover', meta: 'Cactus Print · Qty 2', price: '$48.00', stock: 'Delivered Nov 4', tone: 'success' }] },
        ['Tracking', { mono: '1Z52R8W60311902231' }]
      ]
    },
    {
      title: 'Shipment 2 of 2 — Reno, NV', icon: 'truck', rows: [
        { items: [{ name: 'Chunky Knit Throw Blanket', meta: 'Cream · Qty 1', price: '$59.00', stock: 'Shipped Nov 5 · ETA Nov 10', tone: 'info' }] },
        ['Tracking', { mono: '1Z52R8W60398114427' }],
        ['Est. delivery', { date: '2026-11-10' }]
      ]
    }
  ],
  timeline: [
    ['Oct 30', 'Order placed — split into 2 shipments'],
    ['Nov 2', 'Shipment 1 shipped from Atlanta, GA', 'info'],
    ['Nov 4', 'Shipment 1 delivered', 'success'],
    ['Nov 5', 'Shipment 2 shipped from Reno, NV', 'info']
  ],
  policies: ['shipping'],
  notes: [],
  history: [
    { from: 'bot', text: "Hi! I'm Lumi, the Lumen & Co. virtual assistant. How can I help you today?", ago: 105 },
    { from: 'customer', text: 'my order is missing an item', ago: 90 },
    { from: 'bot', text: 'Sorry about that! Is the item missing from a package you received?', ago: 85 },
    { from: 'customer', text: "yes the blanket isn't in the box", ago: 64 },
    { from: 'bot', text: "Thanks — I'll connect you with an agent who can check your order.", ago: 58 },
    { from: 'system', text: 'Lumi transferred the conversation to you', ago: 1 }
  ],
  start: 'start',
  nodes: {
    start: {
      c: [],
      o: [
        { q: 3, t: "Hi Megan, I'm {agent}. Good news — the blanket isn't missing! Your order was split into two shipments: the pillow covers came from our Atlanta warehouse and arrived Nov 4, and the Chunky Knit Throw is coming separately from Reno. It shipped yesterday with UPS and should arrive Tuesday, Nov 10.", go: 'why', fb: 'Reads the shipments correctly and turns a complaint into good news.' },
        { q: 0, t: "I'm so sorry! I'll send you a new blanket right away.", retry: true, r: ["Oh, ok! Though… my app says 'Shipment 2 of 2'. Is that something else?"], fb: "Check the shipments in the order panel — it's a split shipment, not a missing item." },
        { q: 2, t: 'Hi Megan! Let me check your order.', go: 'split', fb: 'Fine. Introducing yourself after a bot transfer is a nice touch.' }
      ]
    },
    split: {
      c: [],
      o: [
        { q: 3, t: "Thanks for waiting! The blanket isn't missing — your order shipped in two packages. The pillow covers arrived Nov 4, and the blanket shipped yesterday from our Reno warehouse. It should arrive Tuesday, Nov 10.", go: 'why', fb: 'Correct reading of the shipments.' },
        { q: 0, t: "It looks like the warehouse forgot to pack the blanket. I'll file a report.", retry: true, r: ['Really? The app shows something about a second shipment…'], fb: "Read the shipments section: there's a second package on its way." }
      ]
    },
    why: {
      c: ["Oh! Why wasn't it all sent together? Nobody told me"],
      o: [
        { q: 3, t: "Sorry it wasn't clearer! Items ship from whichever warehouse has them in stock, so they reach you as fast as possible. You should have received a separate shipping email for the second package — the tracking number is 1Z52R8W60398114427.", go: 'cost', fb: 'Friendly explanation plus the tracking number.' },
        { q: 1, t: "That's just how our system works.", go: 'cost', r: ["Ok… a heads up would've been nice."], fb: 'Explain the reason in a friendly way.' }
      ]
    },
    cost: {
      c: ['Got it. Did I pay shipping twice?'],
      o: [
        { q: 3, t: 'Not at all — split shipments never cost extra, and as a Lumen Plus member your shipping was free anyway. Is there anything else I can help with?', go: 'end', fb: 'Accurate and reassuring, with a proper close.' },
        { q: 0, t: 'Yes, each package is charged separately.', retry: true, r: ["What? I'm a Plus member…"], fb: 'Split shipments never cost extra — and Plus members get free Express shipping.' },
        { q: 2, t: 'No, you only paid once.', go: 'end', fb: 'Correct and short.' }
      ]
    },
    end: { c: ['Nope, all good. Thanks!'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd5-ethan', day: 5, arrive: 135, replyIn: 23, persona: 'calm',
  channel: 'web', verified: 'na', verifyNote: 'Gift recipient · not the account holder', priority: 'Low',
  topic: 'Exchange a gift', disp: ['return-exchange'],
  customer: {
    first: 'Ethan', last: 'Cole', photo: 'men/19', location: 'Madison, Wisconsin',
    email: 'ethan.cole@gmail.com', phone: '—', since: null,
    plan: 'Guest', ltv: '—', orders: 0, tags: ['Gift recipient']
  },
  sections: [
    {
      title: 'Gift receipt GR-4418-K', icon: 'gift', rows: [
        { note: 'Gift order — never share purchaser details, the price paid or payment info with the recipient. Purchaser is not notified of returns or exchanges.', tone: 'warning' },
        ['Order', 'LM-481930'],
        ['Delivered', { date: '2026-10-31' }],
        ['Recipient', 'Ethan Cole · Madison, WI'],
        {
          items: [{
            name: 'Merino Crewneck Sweater', meta: 'Navy · Size L · Qty 1', price: 'Gift',
            stocks: [['Navy M · In stock (11)', 'success'], ['Navy L · In stock (7)', 'success']]
          }]
        },
        ['Exchange window', { pill: 'Open until Nov 30', tone: 'success' }]
      ]
    },
    {
      title: 'Purchaser (internal only)', icon: 'lock', rows: [
        ['Name', 'Diane Cole'],
        ['Paid', '$98.00'],
        ['Payment', 'Visa •••• 6408']
      ]
    }
  ],
  timeline: [
    ['Oct 27', 'Gift order placed by purchaser'],
    ['Oct 31', 'Delivered to recipient', 'success'],
    ['Nov 6 · 9:30 AM', 'Recipient opened chat']
  ],
  policies: ['gifts', 'returns'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi! My aunt sent me a sweater as a gift but it's too big. Can I exchange it for a medium?", "I don't have an account or anything"],
      o: [
        { q: 3, t: "Hi Ethan! Absolutely — gift exchanges are easy and you don't need an account. Is there a gift receipt in the package? It has a code that starts with 'GR-'.", go: 'code', fb: 'Reassuring, and asks for exactly what you need for a gift exchange.' },
        { q: 0, t: 'Your aunt will need to contact us, since she placed the order.', retry: true, r: ["Oh… I'd rather not, it's a gift and that'd be awkward 😅"], fb: 'Gift recipients can exchange with the gift receipt code — no need to involve the purchaser.' },
        { q: 2, t: 'Hi! Do you have the order number?', go: 'code', r: ["I don't think so… there's a gift receipt with a code though?"], fb: "Recipients usually don't have the order number — ask for the gift receipt code." }
      ]
    },
    code: {
      c: ['Yes! GR-4418-K'],
      o: [
        { q: 3, t: "Thank you! Found it: the Merino Crewneck Sweater in Navy, size L. Size M in Navy is in stock, so I've set up the exchange. I'm emailing a prepaid return label to ethan.cole@gmail.com, and the medium will ship as soon as the large is scanned by the carrier.", go: 'price', fb: 'Confirms the item and stock without revealing anything about the purchaser.' },
        { q: 0, t: 'Found it — the order your aunt Diane placed with her Visa ending in 6408.', retry: true, r: ['Uh… I probably shouldn\'t know that stuff haha'], fb: 'Never reveal purchaser details to a gift recipient.' },
        { q: 2, t: "Found it! Size M is in stock, so I'll set up the exchange.", go: 'price', fb: 'Correct. Explain the return label and when the new size ships.' }
      ]
    },
    price: {
      c: ['Awesome, thanks!', 'Just curious… how much did she pay for it? 😄'],
      o: [
        { q: 3, t: "Haha, I'm afraid that's a gift secret I can't share 🎁 We keep purchase details private on gifts. But I can tell you your aunt has great taste!", go: 'notify', fb: 'Protects privacy while keeping the tone light and friendly.' },
        { q: 0, t: 'It was $98.00.', retry: true, r: ['Ha, ok… wait, are you even allowed to tell me that?'], fb: 'The price paid is private purchaser information. Never share it with the recipient.' },
        { q: 2, t: "Sorry, I can't share that information.", go: 'notify', fb: 'Correct. A friendly tone keeps it light.' }
      ]
    },
    notify: {
      c: ['Haha fair enough. Will she get an email about the exchange?'],
      o: [
        { q: 3, t: "Nope — purchasers aren't notified about gift returns or exchanges, so it stays between us. Your return label is on its way to ethan.cole@gmail.com. Anything else I can help with?", go: 'end', fb: 'Accurate and reassuring, with a proper close.' },
        { q: 0, t: "Yes, she'll get a confirmation email so she knows it was exchanged.", retry: true, r: ["Oh no, really? I didn't want her to know 😬"], fb: 'Gift purchasers are not notified of returns or exchanges.' },
        { q: 2, t: "No, she won't be notified.", go: 'end', fb: 'Correct and short.' }
      ]
    },
    end: { c: ["That's perfect, thank you!"], end: 'resolved' }
  }
});

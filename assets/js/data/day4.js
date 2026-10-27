/* DAY 4 — Tough Customers (Thu, Nov 5, 2026) */

SR.scenario({
  id: 'd4-brandon', day: 4, arrive: 0, replyIn: 8, persona: 'angry', patience: 72,
  channel: 'app', verified: true, priority: 'High',
  topic: 'Express delivery is late', disp: ['refund', 'order-status'],
  customer: {
    first: 'Brandon', last: 'Hayes', photo: 'men/11', location: 'Phoenix, Arizona',
    email: 'brandon.hayes@gmail.com', phone: '+1 (602) 555-0161', since: '2024-11-29',
    plan: 'Standard', ltv: '$540.75', orders: 6, tags: []
  },
  sections: [
    {
      title: 'Order LM-482990', icon: 'box', rows: [
        ['Status', { pill: 'Delayed', tone: 'danger' }],
        ['Placed', { date: '2026-10-30' }],
        { items: [{ name: 'Galaxy Star Projector', meta: 'Kids Edition · Qty 1', price: '$49.99', stock: 'In stock · 64 units', tone: 'success' }] },
        ['Shipping', 'Express (2–3 business days) · $14.99 paid'],
        ['Tax', '$4.30'],
        ['Total', { strong: '$69.28' }],
        ['Payment', 'Visa •••• 3378'],
        ['Store credit', '$0.00']
      ]
    },
    {
      title: 'Shipment', icon: 'truck', rows: [
        ['Carrier', 'UPS 2nd Day Air'],
        ['Tracking', { mono: '1Z7Y30A82264190335' }],
        ['Original ETA', 'Nov 3 – Nov 4'],
        ['New ETA', { date: '2026-11-06', time: 'end of day' }],
        ['Exception', { pill: 'Weather delay · Memphis hub', tone: 'warning' }]
      ]
    }
  ],
  timeline: [
    ['Oct 30 · 10:02 AM', 'Order placed — Express shipping'],
    ['Oct 30 · 4:45 PM', 'Shipped with UPS 2nd Day Air', 'info'],
    ['Nov 2 · 3:10 AM', 'Delay — severe weather at UPS hub, Memphis TN', 'danger'],
    ['Nov 4 · 11:30 PM', 'Departed Memphis, TN', 'info'],
    ['Nov 5 · 6:15 AM', 'In transit — Albuquerque, NM', 'info']
  ],
  policies: ['shipping', 'goodwill', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['This is unbelievable.', 'I PAID for express shipping and my order still isn\'t here. It was supposed to arrive Tuesday!!'],
      o: [
        { q: 3, t: "Hi Brandon, I'm really sorry — you paid for Express and it should have arrived by now, so I completely understand your frustration. Let me check exactly where it is.", go: 'where', fb: 'With an upset customer: acknowledge, validate, act. No excuses yet.' },
        { q: 0, t: "Please calm down, sir. I'm here to help.", retry: true, r: ["Don't tell me to calm down. Just tell me where my package is."], fb: 'Telling a customer to calm down almost always makes it worse.' },
        { q: 2, t: "I'm sorry for the delay. Let me check.", go: 'where', fb: 'OK. Validating his frustration a bit more would help.' },
        { q: 1, t: "Hi Brandon, I understand why you're upset. Just so you know, shipping delays like this one are caused by the carrier, not by us — once a package leaves our warehouse it's in their hands. Let me take a look at where it is right now.", retry: true, r: ["I don't care whose fault it is. I paid YOU."], fb: 'Deflecting blame sounds defensive. Own the experience.' }
      ]
    },
    where: {
      c: ["It's for my daughter's birthday. The party is TOMORROW."],
      o: [
        { q: 3, t: "Thank you for waiting. Your package was held up by bad weather at the UPS hub in Memphis on Nov 2. It left Memphis last night, and the new estimated delivery is tomorrow, Nov 6, by end of day. I can't guarantee the exact time since it's with the carrier, but it's moving again.", go: 'fee', fb: "Specific, honest and realistic — you don't over-promise." },
        { q: 0, t: "Thank you for waiting, and I know how important tomorrow is. Your package was held up by bad weather at the UPS hub in Memphis, but it's moving again now. Good news — it will definitely be there tomorrow morning, before the party.", retry: true, r: ["Definitely? Can you guarantee that? Because the last 'estimate' was wrong."], fb: 'Never guarantee a delivery time controlled by the carrier.' },
        { q: 1, t: "It's delayed because of the weather.", go: 'fee', r: ['Ok and?? When will it get here?'], fb: 'Give the full picture: cause, where it is now, and the new ETA.' }
      ]
    },
    fee: {
      c: ['So I paid $15 for express shipping for nothing?'],
      o: [
        { q: 3, t: "You're right, and that's not fair. Since your Express delivery is late, I've refunded the $14.99 Express shipping fee to your Visa — you don't need to request it. I've also added a $10 store credit to your account for the trouble.", go: 'calm', fb: 'Applies policy proactively (late Express = fee refund) and uses goodwill within your $10 limit.' },
        { q: 0, t: "I've refunded your entire order — you can keep the projector for free.", retry: true, r: ['…really? Are you even allowed to do that?'], fb: 'Way outside policy. The fix is the Express fee refund (plus up to $10 goodwill).' },
        { q: 2, t: "I've refunded the $14.99 Express shipping fee.", go: 'calm', fb: 'Correct per policy. A small goodwill credit (up to $10) would help repair the relationship.' },
        { q: 0, t: "I completely understand why you're frustrated, Brandon. Unfortunately, this delay was caused by bad weather at the UPS hub, which is outside our control, so the Express shipping fee isn't refundable in this case. The good news is that your package is moving again.", retry: true, r: ["Your own website says express fees are refunded if it's late!"], fb: 'Policy: Express / Next-day fees are refunded when late — including carrier delays.' }
      ]
    },
    calm: {
      c: ['Ok… thank you. That helps.', "What if it doesn't arrive tomorrow though?"],
      o: [
        { q: 3, t: "If it hasn't arrived by tomorrow evening, message us and we'll open a carrier trace right away — I've added a note to your order so you won't have to explain everything again. I really hope it makes it in time for the party 🎉", go: 'close', fb: 'Clear backup plan, a note on the account, and a human touch.' },
        { q: 1, t: "Then you'll just have to wait a bit longer.", go: 'close_meh', fb: 'Leaves him without a plan. Explain the next steps.' },
        { q: 2, t: "If it hasn't arrived by tomorrow, just send us a message and we'll look into it straight away. I really hope it makes it in time for your daughter's birthday party — fingers crossed it's on your doorstep!", go: 'close', fb: 'OK. Being specific about the next step (a carrier trace) is more reassuring.' }
      ]
    },
    close: {
      c: ['Alright. Thanks for actually helping.'],
      o: [
        { q: 3, t: 'Of course, Brandon. Is there anything else I can help you with?', go: 'end', fb: 'Proper close.' },
        { q: 2, t: "No problem at all, Brandon — I'm glad I could help, and I hope your daughter has a wonderful birthday tomorrow!", go: 'end_short', fb: "Fine — ask if there's anything else." }
      ]
    },
    close_meh: {
      c: ['Great. Very helpful. 🙄'],
      o: [
        { q: 3, t: "I'm sorry, let me be clearer: if it isn't there by tomorrow evening, message us and we'll open a carrier trace immediately — I've noted everything on your order so you won't need to explain again.", go: 'end_short', fb: 'Good recovery — you gave him the plan he needed.' },
        { q: 1, t: "You're very welcome, Brandon — glad I could help! Your package is on its way and moving again, so it should be with you soon. Thanks for your patience, and enjoy the rest of your day.", go: 'end_cold', fb: 'He was being sarcastic. Read the tone and recover.' }
      ]
    },
    end: { c: ["No, that's it. Thanks."], end: 'resolved' },
    end_short: { c: ['Ok. Bye.'], end: 'resolved' },
    end_cold: { c: ['Whatever.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd4-linda', day: 4, arrive: 10, replyIn: 12, persona: 'angry', patience: 75,
  channel: 'web', verified: true, verifyNote: 'Signed in on lumenco web', priority: 'High',
  topic: 'Return outside window', disp: ['escalated'],
  customer: {
    first: 'Linda', last: 'Morales', photo: 'women/79', location: 'San Diego, California',
    email: 'linda.morales@yahoo.com', phone: '+1 (619) 555-0177', since: '2021-04-04',
    plan: 'Standard', ltv: '$1,764.20', orders: 22, tags: ['Loyal customer']
  },
  sections: [
    {
      title: 'Order LM-478310', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-09-21' }],
        ['Delivered', { date: '2026-09-25' }],
        { items: [{ name: 'Velvet Accent Chair', meta: 'Emerald · Qty 1 · Furniture', price: '$249.00' }] },
        ['Shipping', 'Free (white glove)'],
        ['Tax', '$19.30'],
        ['Total', { strong: '$268.30' }],
        ['Payment', 'Mastercard •••• 4470'],
        ['Return window', { pill: 'Closed Oct 25', tone: 'danger' }],
        ['Defect reported', 'No'],
        { note: 'Agents cannot approve returns outside the window. Supervisor review only.', tone: 'warning' }
      ]
    }
  ],
  timeline: [
    ['Sep 21', 'Order placed'],
    ['Sep 25', 'Delivered — white glove', 'success'],
    ['Oct 25', 'Return window closed', 'neutral'],
    ['Nov 5 · 9:00 AM', 'Online return blocked — outside window', 'warning']
  ],
  policies: ['returns', 'escalation', 'conduct'],
  notes: ['No previous contacts about this order.'],
  history: [
    { from: 'bot', text: "Hi! I'm Lumi, the Lumen & Co. virtual assistant. How can I help you today?", ago: 95 },
    { from: 'customer', text: 'I want to return a chair', ago: 84 },
    { from: 'bot', text: "I can help with returns! Order LM-478310 is outside the 30-day return window, so it isn't eligible for an online return. Would you like to talk to an agent?", ago: 78 },
    { from: 'customer', text: 'YES', ago: 62 },
    { from: 'system', text: 'Lumi transferred the conversation to you', ago: 1 }
  ],
  start: 'start',
  nodes: {
    start: {
      c: ['This bot is useless. I want to return my chair.'],
      o: [
        { q: 3, t: "Hi Linda, I'm {agent}. I'm sorry the assistant couldn't help — I'm here now. I see the Velvet Accent Chair from order LM-478310. Can you tell me a bit more about what's going on with it?", go: 'reason', fb: "You start by listening. Whether it's defective or a preference changes what you can offer." },
        { q: 0, t: "Hi Linda, I'm {agent}, and I'm sorry the assistant wasn't more helpful. I've looked at your order LM-478310, and unfortunately the assistant is right: the Velvet Accent Chair is outside our return window, so I'm not able to accept a return for it.", retry: true, r: ["Seriously? You didn't even ask me what happened."], fb: "Jumping straight to 'no' without listening escalates. Find out the reason first." },
        { q: 2, t: "Hello Linda, I can help with your return question. What's the issue with the chair?", go: 'reason', fb: 'Good. Acknowledging the bot frustration would help even more.' }
      ]
    },
    reason: {
      c: ["The color looks completely different in my living room. It's way darker than the pictures.", 'I want my money back.'],
      o: [
        { q: 3, t: "I'm sorry the color isn't what you expected — that's disappointing with a piece this size. I want to be honest with you: the chair was delivered on Sep 25, 41 days ago, and our return window is 30 days, so it closed on Oct 25. Since it isn't defective, I'm not able to process a return.", go: 'angry', fb: 'Empathetic, transparent and accurate about the dates — no false hope.' },
        { q: 0, t: "I'm so sorry the color isn't what you expected — that's really disappointing with a piece this size, and I can see you've been a loyal customer for years. No problem: I'll make an exception this time and process the return for you right away, so you get your money back on your original card within a few days.", retry: true, r: ['Oh! Great… wait, the bot said I couldn\'t. Can you actually do that?'], fb: "Agents can't make exceptions outside the window — only a supervisor can review one." },
        { q: 0, t: 'Did you check the photos and the color description before buying?', retry: true, r: ['Excuse me? Are you saying this is MY fault?'], fb: "Sounds like you're blaming the customer." },
        { q: 2, t: "Unfortunately it's past the 30-day return window, so it can't be returned.", go: 'angry', fb: 'Correct. Empathy and the exact dates make it easier to accept.' }
      ]
    },
    angry: {
      c: ["That's ridiculous. I've spent almost $2,000 with you people.", 'I want to speak to a manager. NOW.'],
      o: [
        { q: 3, t: "I hear you, and I truly appreciate your loyalty over the years. I've done everything I can within my authority, so I'm escalating this to my supervisor for an exception review. A supervisor will email you at linda.morales@yahoo.com within 24 hours. I can't promise the outcome, but I've written a detailed note so you won't need to repeat anything.", go: 'esc', fb: 'Correct escalation: she asked for a manager after you tried to help. Honest expectations: 24 hours, outcome not guaranteed.' },
        { q: 0, t: "I'm sorry, there's no manager available right now.", retry: true, r: ["Every company has a manager. Don't lie to me."], fb: 'Never refuse or lie about escalation. She asked after you tried to help — escalate.' },
        { q: 1, t: 'Our policy is very clear, and a manager will just tell you the same thing.', retry: true, r: ["I don't care. I want to hear it from THEM."], fb: "Don't block an escalation request — it makes the customer angrier." },
        { q: 2, t: "Of course, I'll escalate this to a supervisor.", go: 'esc', fb: 'Right call. Tell her what happens next and when (email within 24 hours).' }
      ]
    },
    esc: {
      c: ['Fine. And they will actually contact me?'],
      o: [
        { q: 3, t: "Yes — you'll receive an email within 24 hours. Your case reference is ESC-55127. Is there anything else I can help you with in the meantime?", go: 'end', fb: 'Firm timeframe, a case reference and a proper close.' },
        { q: 1, t: 'Probably, yes — the supervisors are usually pretty good about getting back to people, Linda, although it can depend on how busy they are this week. Keep an eye on your inbox over the next few days.', go: 'end_cold', fb: 'Sounds unsure. Give a firm timeframe and a case reference.' },
        { q: 2, t: "Yes, they will. A supervisor will review everything I've noted on your case and get back to you by email within 24 hours, so you won't have to explain the situation again.", go: 'end', fb: 'Correct. A case reference adds confidence.' }
      ]
    },
    end: { c: ['No. Thank you.'], end: 'resolved' },
    end_cold: { c: ['Unbelievable.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd4-jamal', day: 4, arrive: 30, replyIn: 10, persona: 'impatient',
  channel: 'app', verified: true, priority: 'Medium',
  topic: 'Unexpected $79 charge', disp: ['membership', 'refund'],
  customer: {
    first: 'Jamal', last: 'Wright', photo: 'men/67', location: 'Baltimore, Maryland',
    email: 'jamal.wright@outlook.com', phone: '+1 (410) 555-0124', since: '2023-10-28',
    plan: 'Lumen Plus · Annual', ltv: '$873.40', orders: 12, tags: ['Lumen Plus']
  },
  sections: [
    {
      title: 'Lumen Plus membership', icon: 'award', rows: [
        ['Plan', 'Annual · $79.00 / year'],
        ['Member since', { date: '2023-10-28' }],
        ['Last renewal', { date: '2026-10-28' }],
        ['Renewal charge', '$79.00 · Mastercard •••• 2210'],
        ['Reminder email', { date: '2026-10-21' }],
        ['Benefits used since renewal', { pill: 'None', tone: 'success' }],
        ['Last 12 months', '7 orders · saved $64.93 on shipping'],
        ['Auto-renew', 'On']
      ]
    },
    {
      title: 'Recent orders', icon: 'box', rows: [
        ['LM-479110', 'Oct 3 · Delivered · $54.20'],
        ['LM-476052', 'Sep 9 · Delivered · $112.80']
      ]
    }
  ],
  timeline: [
    ['Oct 28, 2023', 'Joined Lumen Plus (annual)'],
    ['Oct 28, 2025', 'Renewed — $79.00'],
    ['Oct 21', 'Renewal reminder email sent'],
    ['Oct 28', 'Renewed — $79.00 charged', 'warning']
  ],
  policies: ['membership', 'refunds'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Why was I charged $79?? I didn't buy anything this month"],
      o: [
        { q: 3, t: 'Hi Jamal, sorry for the surprise — let me check. The $79.00 charge on Oct 28 is the annual renewal of your Lumen Plus membership, which you first joined on Oct 28, 2023. A reminder email was sent on Oct 21.', go: 'cancel', fb: 'Identifies the charge precisely, with dates and the reminder.' },
        { q: 0, t: "Hi Jamal, I'm sorry for the surprise! A $79 charge usually means an order went through, so you must have placed one recently — could you please check the order history in your account? It may have been a gift or something ordered from another device.", retry: true, r: ["I haven't ordered anything in weeks. Look it up please."], fb: "Check the account first — it's the Lumen Plus annual renewal." },
        { q: 2, t: "Hi Jamal, sorry for the surprise, and thanks for reaching out about it! I've looked at your account, and that $79 charge is the yearly renewal of your Lumen Plus membership, which renews automatically each year.", go: 'cancel', fb: 'Correct. Adding the date and the reminder email makes it clear.' }
      ]
    },
    cancel: {
      c: ["I don't even remember signing up for that.", 'I want it cancelled and my money back.'],
      o: [
        { q: 3, t: "Understood. Just so you know before I do it: in the last year Plus saved you about $65 in shipping across 7 orders. If $79 a year doesn't fit, there's also a monthly plan at $9.99. Would you like to keep either option, or shall I go ahead and cancel?", go: 'insist', fb: 'One respectful, personalized retention attempt — then let him decide.' },
        { q: 2, t: "Done — I've cancelled your Lumen Plus membership. Since it's been 8 days since the renewal and you haven't used any Plus benefits, you get a full refund of $79.00 to your Mastercard ending in 2210 within 5–7 business days.", go: 'done', fb: 'Correct and efficient. Many companies expect one light retention offer first — his savings data could have kept a customer.' },
        { q: 0, t: "I completely understand, Jamal, and I can cancel the membership for you right away so it doesn't renew again next year. Unfortunately, membership fees are non-refundable once the renewal has gone through, so the $79 can't be returned to your Mastercard this time.", retry: true, r: ["Seriously? I haven't even used it."], fb: 'Wrong: within 14 days of renewal with no benefits used, it\'s a full refund.' },
        { q: 1, t: "Are you sure? You'll lose free Express shipping, free returns, early access to sales, exclusive deals…", go: 'insist', fb: 'A generic sales pitch. Personalize it with his usage — or simply respect the request.' }
      ]
    },
    insist: {
      c: ['No thanks. Just cancel it please.'],
      o: [
        { q: 3, t: "No problem at all. I've cancelled your Lumen Plus membership. Since it's been 8 days since the renewal and you haven't used any benefits, you get a full refund of $79.00 to your Mastercard ending in 2210 within 5–7 business days. You'll get a confirmation email shortly.", go: 'done', fb: 'Respects the decision and applies the refund policy precisely.' },
        { q: 0, t: "Okay — I've cancelled your Lumen Plus membership, so it won't renew and you won't be charged next year. Unfortunately the $79 isn't refundable since the renewal already went through, but you'll keep your Plus benefits until the end of this membership year.", retry: true, r: ["What? It's been a week and I haven't used it."], fb: 'He qualifies for a full refund: within 14 days and no benefits used.' },
        { q: 1, t: "Are you really sure? It's honestly a great deal.", retry: true, r: ["Yes. I'm sure. Cancel it."], fb: "Respect the 'no' — one retention attempt is enough." }
      ]
    },
    done: {
      c: ['Ok good. Do I lose anything else?'],
      o: [
        { q: 3, t: 'Your Plus benefits end today since the renewal is refunded, but your account, order history and saved addresses stay exactly the same. You can rejoin anytime. Anything else I can help with?', go: 'end', fb: 'Clear about what changes and what stays.' },
        { q: 2, t: 'Just the Plus benefits. Anything else?', go: 'end', fb: 'Correct and short.' },
        { q: 0, t: 'Since the membership is cancelled and refunded, Jamal, your Plus benefits end today, and your account and order history will be deleted too as part of the cancellation. If you want to shop with us again later, you can always create a new account.', retry: true, r: ["What?! I didn't ask for that!"], fb: 'Wrong — only the Plus benefits end. The account and history stay.' }
      ]
    },
    end: { c: ['No that\'s it, thanks for sorting it out.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd4-chloe', day: 4, arrive: 55, replyIn: 18, persona: 'neutral',
  channel: 'whatsapp', verified: true, verifyNote: 'WhatsApp number matches account', priority: 'Medium',
  topic: 'Received the wrong color', disp: ['replacement'],
  customer: {
    first: 'Chloe', last: 'Dubois', photo: 'women/33', location: 'Boston, Massachusetts',
    email: 'chloe.dubois@gmail.com', phone: '+1 (617) 555-0139', since: '2025-02-19',
    plan: 'Lumen Plus · Monthly', ltv: '$455.00', orders: 5, tags: ['Lumen Plus']
  },
  sections: [
    {
      title: 'Order LM-482777', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-31' }],
        ['Delivered', { date: '2026-11-04' }],
        {
          items: [{
            name: 'Weekender Canvas Duffel', meta: 'Ordered: Tan (WD-TAN) · Qty 1', price: '$78.00',
            stocks: [['Tan · In stock (17)', 'success'], ['Olive · In stock (23)', 'success']]
          }]
        },
        ['Shipping', 'Express · Free (Lumen Plus)'],
        ['Tax', '$4.88'],
        ['Total', { strong: '$82.88' }],
        ['Payment', 'Apple Pay (Visa •••• 0881)'],
        { note: 'Warehouse scan Oct 31: SKU WD-OLV (Olive) picked for line WD-TAN (Tan) — possible picking error.', tone: 'warning' }
      ]
    }
  ],
  timeline: [
    ['Oct 31 · 12:40 PM', 'Order placed'],
    ['Oct 31 · 5:02 PM', 'Packed — scanned SKU WD-OLV', 'warning'],
    ['Nov 1', 'Shipped with UPS — Express', 'info'],
    ['Nov 4 · 2:15 PM', 'Delivered', 'success']
  ],
  policies: ['damaged', 'shipping', 'returns'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hi, I ordered the tan duffel bag and got an olive green one 😑', 'I need the tan one for a trip on Sunday'],
      o: [
        { q: 3, t: "Hi Chloe, I'm so sorry — that's our mistake. You ordered the Weekender Canvas Duffel in Tan, delivered yesterday, and our warehouse scan shows the olive one was picked by error. The tan one is in stock, so I can send it to you right away.", go: 'ship', fb: 'Owns the mistake, confirms it with the panel, and moves straight to the solution.' },
        { q: 0, t: 'Are you sure? The tan can look a bit green in some lighting.', retry: true, r: ["It's literally olive. The tag even says 'Olive'."], fb: "Don't question the customer — the warehouse scan even confirms the picking error." },
        { q: 2, t: 'Sorry about that! Let me look into it.', go: 'look', fb: 'OK. The panel already shows the picking error — you could confirm it right away.' },
        { q: 0, t: "Hi Chloe, I'm so sorry about the mix-up — that's really frustrating with a trip coming up! The quickest fix is to return the olive bag with the label in your account and then place a new order for the tan one, which is in stock right now, so it can head your way.", retry: true, r: ['Why should I pay again for YOUR mistake?'], fb: "Wrong item = free replacement. She shouldn't have to reorder or pay." }
      ]
    },
    look: {
      c: [],
      o: [
        { q: 3, t: "Thanks for waiting! I can see our warehouse picked the olive bag by mistake. The tan one is in stock, so I'll send it to you right away.", go: 'ship', fb: 'Confirms the error and offers the fix.' },
        { q: 0, t: 'Thanks for waiting! It looks like you ordered the olive one, which is what our warehouse sent you.', retry: true, r: ['No, I ordered TAN. Check again please.'], fb: 'Read the order: she ordered Tan (WD-TAN).' }
      ]
    },
    ship: {
      c: ['Will it get here before Sunday though?'],
      o: [
        { q: 3, t: "It will — since this was our error, I've upgraded the replacement to Next-day shipping at no cost. It's before 2 PM, so it ships today and arrives tomorrow, Friday Nov 6. Your replacement order is LM-484115.", go: 'return', fb: 'Uses the policy option (free Next-day upgrade for our error) to meet her real need.' },
        { q: 1, t: "Great question, Chloe! Since this was our mistake, your replacement ships today with free Express shipping, which takes 2–3 business days. You'll get the tracking number by email shortly, and your replacement order number is LM-484115.", retry: true, r: ["2–3 business days? That's Monday at the earliest… my trip is Sunday 😩"], fb: 'Express would arrive after Sunday. Policy allows a free Next-day upgrade when it\'s our error and she needs it sooner.' },
        { q: 0, t: "Yes, it'll be there on Saturday for sure! The replacement ships out from our warehouse today, so you'll have the tan duffel in plenty of time to pack it for your trip on Sunday — you'll get the tracking by email.", retry: true, r: ['For sure? How do you know?'], fb: "Don't guess delivery dates — use the shipping policy." }
      ]
    },
    return: {
      c: ['Perfect!! What do I do with the olive one?'],
      o: [
        { q: 3, t: "I've emailed you a prepaid return label. Just drop the olive bag at any UPS location within 30 days — no cost to you.", go: 'close', fb: 'Clear, free and with the deadline.' },
        { q: 1, t: "Good news, Chloe — you don't need to send anything back! Just keep the olive bag or give it to a friend; there's no need to deal with a return label.", retry: true, r: ["Really? A $78 bag? That's generous… are you sure?"], fb: 'Items $25 and over must be returned with the free label. Only items under $25 can be kept.' },
        { q: 2, t: "Please send it back with the prepaid label I've emailed you.", go: 'close', fb: "Correct. Mentioning the 30-day window and that it's free helps." }
      ]
    },
    close: {
      c: ['Great, thanks for fixing it so fast! 🙌'],
      o: [
        { q: 3, t: 'Happy to help, Chloe — enjoy your trip! Is there anything else I can do for you?', go: 'end', fb: 'Personal and complete.' },
        { q: 2, t: 'No problem at all, Chloe — sorry again about the mix-up! The tan duffel is on its way. Have a fantastic trip on Sunday!', go: 'end_short', fb: "Fine — ask if there's anything else." }
      ]
    },
    end: { c: ["That's all! Have a nice day"], end: 'resolved' },
    end_short: { c: ['Bye!'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd4-victor', day: 4, arrive: 85, replyIn: 24, persona: 'neutral',
  channel: 'web', verified: true, verifyNote: 'Signed in on lumenco web', priority: 'Medium',
  topic: 'Smartwatch battery drains fast', disp: ['tech-support', 'product-info'],
  customer: {
    first: 'Victor', last: 'Petrov', photo: 'men/46', location: 'Philadelphia, Pennsylvania',
    email: 'victor.petrov@gmail.com', phone: '+1 (215) 555-0152', since: '2022-12-12',
    plan: 'Standard', ltv: '$1,190.30', orders: 11, tags: []
  },
  sections: [
    {
      title: 'Order LM-475120', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-07-30' }],
        ['Delivered', { date: '2026-08-03' }],
        { items: [{ name: 'Pulse Fit Smartwatch S2', meta: 'Black · Qty 1 · Electronics', price: '$199.00', stock: 'In stock · 40 units', tone: 'success' }] },
        ['Total', { strong: '$210.94' }],
        ['Payment', 'Visa •••• 9214'],
        ['Return window', { pill: 'Closed Aug 18 (15 days)', tone: 'neutral' }],
        ['Warranty', { pill: '1-year · active until Aug 3, 2027', tone: 'success' }],
        ['Lumen Protect', 'Not purchased']
      ]
    },
    {
      title: 'Product support', icon: 'info', rows: [
        ['Latest software', '2.3.0 (released Oct 20)'],
        { note: 'Known issue: software 2.1.x causes heavy battery drain after background sync. Fixed in 2.3.0. Update via Pulse app › Device › Software update (keep the watch on the charger, ~10 min).', tone: 'warning' },
        ['Normal battery life', 'Up to 3 days']
      ]
    }
  ],
  timeline: [
    ['Jul 30', 'Order placed'],
    ['Aug 3', 'Delivered', 'success'],
    ['Oct 20', 'Software 2.3.0 released (battery fix)', 'info']
  ],
  policies: ['warranty', 'returns'],
  notes: [],
  history: [
    { from: 'bot', text: "Hi! I'm Lumi, the Lumen & Co. virtual assistant. How can I help you today?", ago: 115 },
    { from: 'customer', text: 'my smartwatch battery dies after like 4 hours. it used to last 3 days', ago: 100 },
    { from: 'bot', text: 'Sorry to hear that! Have you tried restarting your watch?', ago: 95 },
    { from: 'customer', text: 'yes obviously', ago: 72 },
    { from: 'bot', text: 'Thanks for trying that. Let me connect you with an agent.', ago: 68 },
    { from: 'system', text: 'Lumi transferred the conversation to you', ago: 1 }
  ],
  start: 'start',
  nodes: {
    start: {
      c: [],
      o: [
        { q: 3, t: "Hi Victor, I'm {agent}. Sorry about the battery — going from 3 days to 4 hours definitely isn't normal. Your Pulse Fit S2 was delivered on Aug 3, so it's covered by the 1-year warranty. Before we go that route, could you check which software version it's on? Settings › About › Software.", go: 'version', fb: "Reassures him about the warranty and starts proper troubleshooting — without repeating the bot's restart tip." },
        { q: 0, t: "Hi Victor, I'm {agent}, and I'm sorry about the battery — going from 3 days to 4 hours is really frustrating. I've checked your order: your Pulse Fit S2 was delivered on Aug 3, and the return window for electronics is 15 days, so unfortunately there's nothing I can do for this one.", retry: true, r: ["It's 3 months old and broken. There's no warranty??"], fb: 'The return window closed, but the 1-year warranty covers defects. Always check the warranty.' },
        { q: 2, t: "Hi Victor, let's try some troubleshooting first. Could you check the software version on the watch?", go: 'version', fb: "Good. Reassuring him that it's under warranty would lower his stress." },
        { q: 1, t: "I'll ship you a brand-new watch today.", retry: true, r: ['Oh nice… without checking anything? Ok…'], fb: 'Policy: troubleshoot first. Warranty replacements ship once the defective unit is received (advance replacement is only for Lumen Plus).' }
      ]
    },
    version: {
      c: ['It says 2.1.4'],
      o: [
        { q: 3, t: "Thanks — that's very likely the cause. Version 2.1.x has a known battery-drain bug that's fixed in 2.3.0. Could you update it? Open the Pulse app on your phone › Device › Software update, and keep the watch on the charger during the update (about 10 minutes).", go: 'updated', fb: 'Uses the known-issue note to find the real fix, with clear steps.' },
        { q: 1, t: 'Okay, please do a factory reset on the watch.', retry: true, r: ['A factory reset will wipe everything… is that really necessary?'], fb: 'Check known issues first: 2.1.x has a battery bug fixed in 2.3.0 — a much less disruptive fix.' },
        { q: 0, t: "Thanks for checking! 2.1.4 is the latest software version for the Pulse Fit S2, so the software is up to date and this must be a hardware problem with the battery. Since you're within the 1-year warranty, we can look at a replacement watch for you.", retry: true, r: ['Is it? The app mentioned an update a while ago…'], fb: 'The latest version is 2.3.0 — check the product panel.' }
      ]
    },
    updated: {
      c: ["ok updating... done. it's on 2.3.0 now", 'how do I know if it worked though?'],
      o: [
        { q: 3, t: 'Great! Charge it to 100% and use it as normal today. If the battery still drains fast by tomorrow, message us with reference WR-30481 and we\'ll start the warranty replacement right away: we\'ll email a prepaid label and ship a new watch the same day we receive yours.', go: 'close', fb: 'Clear test plan, a reference number, and the exact warranty process as a backup.' },
        { q: 2, t: 'Just use it as normal and let us know if it happens again.', go: 'close', fb: "Give him a reference and explain the warranty next step so he won't start over." },
        { q: 0, t: "Great, thanks for updating it, Victor! Charge it to 100% and use it as normal today. If the battery still drains fast after that, you'll need to contact Pulse, the manufacturer, for a warranty replacement — they handle all hardware repairs directly and will walk you through it.", retry: true, r: ["I bought it from you though. Can't you handle it?"], fb: 'Lumen & Co. handles warranty claims for products it sells.' }
      ]
    },
    close: {
      c: ['ok cool. thanks for actually fixing it instead of just saying restart lol'],
      o: [
        { q: 3, t: "Haha, happy to help! Fingers crossed the battery's back to normal. Anything else I can help you with today?", go: 'end', fb: 'Matches his tone and closes properly.' },
        { q: 2, t: 'No problem — glad the update did the trick! Enjoy the watch.', go: 'end', fb: 'Fine.' }
      ]
    },
    end: { c: ['nope, all good 👍'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd4-olivia', day: 4, arrive: 120, replyIn: 8, persona: 'anxious',
  channel: 'web', verified: false, verifyNote: 'Guest chat — locked out of account', priority: 'Urgent',
  topic: 'Account hacked?', disp: ['escalated', 'account'],
  customer: {
    first: 'Olivia', last: 'Turner', photo: 'women/90', location: 'Nashville, Tennessee',
    email: 'olivia.turner.shop@outlook.com', emailNote: 'Changed today 3:12 AM · previous: olivia.turner@gmail.com',
    phone: '+1 (615) 555-0156', since: '2020-03-08',
    plan: 'Standard', ltv: '$2,045.10', orders: 26, tags: ['Customer since 2020']
  },
  sections: [
    {
      title: 'Account security', icon: 'shieldAlert', rows: [
        ['Status', { pill: 'Suspicious activity', tone: 'danger' }],
        ['Password changed', { date: '2026-11-05', time: '3:10 AM' }],
        ['Email changed', { date: '2026-11-05', time: '3:12 AM' }],
        ['New email', 'olivia.turner.shop@outlook.com'],
        ['Previous email', 'olivia.turner@gmail.com'],
        ['Device', 'New Windows PC · Newark, NJ'],
        ['Phone on file', '+1 (615) 555-0156 (unchanged)'],
        ['Billing ZIP', '37203 (unchanged)']
      ]
    },
    {
      title: 'Order LM-483688', icon: 'box', rows: [
        ['Status', { pill: 'Processing', tone: 'warning' }],
        ['Placed', { date: '2026-11-05', time: '3:20 AM' }],
        { items: [{ name: 'Pulse ANC Headphones', meta: 'Black · Qty 3 · $99.00 each', price: '$297.00' }] },
        ['Shipping', 'Express · $14.99'],
        ['Total', { strong: '$331.67' }],
        ['Payment', 'Saved card — Visa •••• 5583'],
        ['Ship to', '72 Ferry St, Newark, NJ 07105 (new address)']
      ]
    }
  ],
  timeline: [
    ['Nov 5 · 3:08 AM', 'Sign-in from new device — Newark, NJ', 'warning'],
    ['Nov 5 · 3:10 AM', 'Password changed', 'danger'],
    ['Nov 5 · 3:12 AM', 'Email changed', 'danger'],
    ['Nov 5 · 3:18 AM', 'New shipping address added — Newark, NJ', 'danger'],
    ['Nov 5 · 3:20 AM', 'Order LM-483688 placed — $331.67', 'danger']
  ],
  policies: ['accounts', 'verification', 'escalation'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Please help!! I just got an email saying my password was changed and I didn't do that", "Now I can't log in"],
      o: [
        { q: 3, t: "Hi, I'm {agent} — I'm here to help and we'll act quickly. First I need to confirm you're the account owner: could you share your full name, the phone number on the account and your billing ZIP code?", go: 'verify', fb: "Calm, fast, and verifies with details an attacker hasn't changed." },
        { q: 0, t: "What's the new email on the account? I'll tell you if it matches.", retry: true, r: ["I don't know the new email, that's the whole problem!!"], fb: 'Never discuss account details before verification.' },
        { q: 1, t: "Hi Olivia, I'm {agent}, and I'm sorry — that must be really scary. The quickest way back in is to reset your password with the 'Forgot password' link on the sign-in page. It only takes a minute, and then you can change anything that looks wrong.", retry: true, r: ["I tried! The reset goes to an email that isn't mine anymore 😭"], fb: "The email was changed, so self-service won't work. This needs verification and escalation." },
        { q: 1, t: "Oh no! What's the email address on your account?", retry: true, r: ['olivia.turner@gmail.com — but I think someone changed it?? 😰'], fb: "The email was just changed by someone else, so it can't verify her. Use the phone on file and billing ZIP (pre-change details)." }
      ]
    },
    verify: {
      c: ['Olivia Turner. Phone is 615-555-0156 and zip is 37203'],
      o: [
        { q: 3, t: "Thank you, Olivia — you're verified. Someone changed the password and email on your account early this morning and placed an order for $331.67 to be shipped to Newark, NJ. I'm escalating this to our Trust & Safety team right now, and your account is being locked so no more changes can be made.", go: 'order', fb: 'Verified with pre-change details, explains what you see, and escalates to the right team immediately.' },
        { q: 0, t: "Thank you, Olivia — you're verified. I can see someone changed the email on your account early this morning, so I've changed the email back to olivia.turner@gmail.com. You can now use 'Forgot password' to choose a new password and sign in again within a few minutes, so you're all set.", retry: true, r: ['Oh thank god. Wait… can you do that from a chat? Is my account safe now?'], fb: "Agents can't change emails in chat. Suspected takeovers go to Trust & Safety, who lock and restore the account." },
        { q: 2, t: "Thanks. This looks like unauthorized access, so I'm sending it to our security team.", go: 'order', fb: 'Correct action. Telling her what you see (and that the account is locked) reassures her.' }
      ]
    },
    order: {
      c: ['An ORDER?? With my card??', 'Can you cancel it?'],
      o: [
        { q: 3, t: "Yes — it's still processing and hasn't shipped, so Trust & Safety will cancel it as part of the case and you won't be charged. They'll call you at 615-555-0156 within 2 hours to restore your account. In the meantime, I'd recommend changing your email password too, in case it was compromised.", go: 'close', fb: 'Clear outcome, who will contact her, how and when — plus a useful security tip.' },
        { q: 1, t: "You'll need to contact your bank to dispute the charge.", retry: true, r: ["But it hasn't even shipped? Can't you just stop it?"], fb: 'The order is still Processing — it can be cancelled before any charge. No dispute needed.' },
        { q: 2, t: "Yes, it'll be cancelled since it hasn't shipped.", go: 'close', fb: 'Correct. Share the timeline (2 hours) and how they will contact her.' },
        { q: 0, t: "Yes — that order is still processing, so Trust & Safety will cancel it as part of the case and it won't ship to Newark. Your card will still be charged for it when it's processed, but the $331.67 will be refunded automatically within 5–7 days, so you won't lose any money in the end.", retry: true, r: ['Charged?? Why would I be charged for something I didn\'t order?'], fb: 'Customers are only charged when an order ships. This one is still Processing.' }
      ]
    },
    close: {
      c: ['Ok… thank you so much. I was panicking 😮‍💨'],
      o: [
        { q: 3, t: 'Totally understandable — you did the right thing by contacting us right away. Your case number is TS-90233. Is there anything else I can help you with right now?', go: 'end', fb: 'Reassuring, gives a case number and closes properly.' },
        { q: 2, t: "You're very welcome, Olivia — it's completely understandable to panic when something like this happens, and you did the right thing. Is there anything else I can help you with right now?", go: 'end', fb: 'Fine. A case number would add confidence.' }
      ]
    },
    end: { c: ['No, thank you for acting so fast.'], end: 'resolved' }
  }
});

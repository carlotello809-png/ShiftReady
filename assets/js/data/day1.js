/* DAY 1 — Orientation (Mon, Nov 2, 2026)
   Option fields: t = agent text · q = quality (3 excellent, 2 good, 1 weak, 0 poor)
   go = next node · r = customer reaction · retry = customer pushes back and you choose again
   fb = coaching feedback · end = closes the chat ('resolved' | 'unresolved') */

SR.scenario({
  id: 'd1-daniel', day: 1, arrive: 0, replyIn: 12, persona: 'calm',
  channel: 'app', verified: true, priority: 'Low',
  topic: 'Where is my order?', disp: ['order-status'],
  customer: {
    first: 'Daniel', last: 'Okafor', photo: 'men/32', location: 'Austin, Texas',
    email: 'daniel.okafor@gmail.com', phone: '+1 (512) 555-0148', since: '2024-03-18',
    plan: 'Standard', ltv: '$412.80', orders: 5, tags: ['Repeat customer']
  },
  sections: [
    {
      title: 'Order LM-482913', icon: 'box', rows: [
        ['Status', { pill: 'Shipped', tone: 'info' }],
        ['Placed', { date: '2026-10-28', time: '9:14 PM' }],
        { items: [{ name: 'Aria Wireless Earbuds', meta: 'White · Qty 1 · SKU AU-2210', price: '$79.99', stock: 'In stock · 148 units', tone: 'success' }] },
        ['Subtotal', '$79.99'],
        ['Shipping', 'Standard (5–7 business days) · Free'],
        ['Tax', '$6.60'],
        ['Total', { strong: '$86.59' }],
        ['Payment', 'Visa •••• 4821']
      ]
    },
    {
      title: 'Shipment', icon: 'truck', rows: [
        ['Carrier', 'UPS Ground'],
        ['Tracking', { mono: '1Z84A9E20314772913' }],
        ['Shipped', { date: '2026-10-30' }],
        ['Est. delivery', { date: '2026-11-04' }],
        ['Ship to', '2207 Barton Hills Dr, Austin, TX 78704']
      ]
    }
  ],
  timeline: [
    ['Oct 28 · 9:14 PM', 'Order placed'],
    ['Oct 28 · 9:15 PM', 'Payment authorized — Visa •••• 4821'],
    ['Oct 30 · 2:40 PM', 'Shipped with UPS Ground', 'info'],
    ['Nov 1 · 7:12 AM', 'In transit — Dallas, TX', 'info'],
    ['Nov 2 · 6:05 AM', 'Arrived at UPS facility — Austin, TX', 'info']
  ],
  policies: ['shipping', 'conduct'],
  notes: ['Oct 12 — Asked which earbud colors were in stock. (Agent: Maya R.)'],
  start: 'start',
  nodes: {
    start: {
      c: ['Hi there 👋', "I ordered some earbuds last week and they still haven't arrived. Can you tell me where they are?"],
      o: [
        { q: 3, t: "Hi Daniel, thanks for reaching out! I'd be happy to check that for you. I can see your order LM-482913 for the Aria Wireless Earbuds — give me just a moment to pull up the tracking.", go: 'tracking', fb: 'Warm greeting, uses his name, and confirms the exact order before digging in.' },
        { q: 1, t: 'Hello. What is your order number?', go: 'tracking', r: ["Uh, isn't it on my account? I'm logged into the app.", "It's LM-482913 I think."], fb: "He's chatting from the app, so he's verified and the order is already on your screen. Asking for information you have adds effort and sounds cold." },
        { q: 0, t: 'Orders usually take 5–7 business days to arrive, so please wait a few more days and it should show up.', retry: true, r: ["Okay… but it's been almost a week. Can you actually check where it is?"], fb: 'A generic answer without looking at his order. Always check the order details before responding.' },
        { q: 2, t: 'Hi Daniel! Sorry to hear that — let me check for you, one moment please.', go: 'tracking', fb: "Friendly and quick. Confirming which order you're looking at builds even more trust." }
      ]
    },
    tracking: {
      c: [],
      o: [
        { q: 3, t: "Good news — your earbuds shipped on Oct 30 with UPS and they're already at the UPS facility in Austin. The estimated delivery is this Wednesday, Nov 4. Your tracking number is 1Z84A9E20314772913.", go: 'why', fb: 'Clear, specific and accurate: ship date, carrier, current location, ETA and tracking number.' },
        { q: 0, t: "Good news — your earbuds shipped on Oct 28 with FedEx and they're scheduled to arrive today, Nov 2. Your tracking number is 1Z84A9E20314772913.", retry: true, r: ["Today? The app says Wednesday… and it's UPS, not FedEx. Are you looking at my order?"], fb: 'Polished but wrong: the order was placed Oct 28, shipped Oct 30 with UPS, and the ETA is Nov 4. Double-check the order panel.' },
        { q: 1, t: "It's in transit. You'll get it soon!", retry: true, r: ['Soon when? Do you have an actual date?'], fb: 'Too vague. Customers want specifics — give the ETA and the tracking number.' },
        { q: 2, t: "It's with UPS and the estimated delivery is Wednesday, Nov 4. You can follow it in the app under My Orders.", go: 'why', fb: 'Accurate. Adding where it is right now and the tracking number would make it complete.' }
      ]
    },
    why: {
      c: ['Oh okay. I thought it would be faster though — I ordered it last Wednesday.', 'Why does it take so long?'],
      o: [
        { q: 3, t: "I understand, a week feels long! Your order used Standard shipping, which takes 5–7 business days — and weekends don't count. Wednesday, Nov 4 is the 5th business day, so it's right on schedule.", go: 'close', fb: 'Empathy plus a simple explanation of the policy, without blaming the customer.' },
        { q: 1, t: "That's because you chose the slowest shipping option at checkout.", go: 'close', r: ['Well… it was the free option 😕'], fb: "Technically true, but it sounds like you're blaming him. Explain shipping times neutrally." },
        { q: 0, t: "Sorry about that! I'll upgrade your order to Next-day shipping for free so it arrives tomorrow.", retry: true, r: ['Oh wow — can you even do that if it already shipped?'], fb: "Shipping speed can't be changed once the package is with the carrier. Never promise what you can't deliver." },
        { q: 2, t: 'Standard shipping takes 5–7 business days, so Nov 4 is within the expected time.', go: 'close', fb: 'Correct. A touch of empathy would make it land better.' }
      ]
    },
    close: {
      c: ['Got it, that makes sense. Wednesday works for me 👍'],
      o: [
        { q: 3, t: "Great! You'll get a notification in the app as soon as it's out for delivery. Is there anything else I can help you with today?", go: 'end', fb: 'Sets an expectation and offers more help — a strong close.' },
        { q: 2, t: 'Perfect, glad I could help. Have a great day!', go: 'end_short', fb: "Polite, but always ask if there's anything else before closing." },
        { q: 1, t: 'Ok. Bye.', go: 'end_cold', fb: 'Too abrupt. The closing is part of the customer experience.' }
      ]
    },
    end: { c: ["Nope, that's everything. Thanks for the help, have a good one!"], end: 'resolved' },
    end_short: { c: ['Thanks, you too!'], end: 'resolved' },
    end_cold: { c: ['…okay. Bye.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd1-priya', day: 1, arrive: 25, replyIn: 18, persona: 'neutral',
  channel: 'web', verified: false, verifyNote: 'Guest · email confirmed by Lumi (1 of 2 details)', priority: 'Medium',
  topic: 'Cancel my order', disp: ['cancellation'],
  customer: {
    first: 'Priya', last: 'Raman', photo: 'women/63', location: 'Portland, Oregon',
    email: 'priya.raman@outlook.com', phone: '+1 (503) 555-0127', since: '2026-11-02',
    plan: 'Standard', ltv: '$0.00', orders: 1, tags: ['New customer']
  },
  sections: [
    {
      title: 'Order LM-483377', icon: 'box', rows: [
        ['Status', { pill: 'Processing', tone: 'warning' }],
        ['Placed', { date: '2026-11-02', time: '8:41 AM' }],
        {
          items: [
            { name: 'Linen Duvet Cover Set', meta: 'Queen · White · Qty 1', price: '$119.00', stock: 'In stock · 36 units', tone: 'success' },
            { name: 'Linen Pillowcases (Set of 2)', meta: 'White · Qty 1', price: '$39.00', stock: 'In stock · 52 units', tone: 'success' }
          ]
        },
        ['Subtotal', '$158.00'],
        ['Promo code', 'WELCOME10 · −$15.80'],
        ['Shipping', 'Standard · Free'],
        ['Tax', '$0.00 (Oregon)'],
        ['Total', { strong: '$142.20' }],
        ['Payment', 'Mastercard •••• 9012'],
        ['Billing ZIP', '97214'],
        ['Ship to', '3415 SE Belmont St, Portland, OR 97214']
      ]
    }
  ],
  timeline: [
    ['Nov 2 · 8:39 AM', 'Account created'],
    ['Nov 2 · 8:41 AM', 'Order placed with code WELCOME10'],
    ['Nov 2 · 8:41 AM', 'Payment authorized — Mastercard •••• 9012'],
    ['Nov 3 (scheduled)', 'Ships from Portland warehouse', 'warning']
  ],
  policies: ['verification', 'orders', 'promotions'],
  notes: [],
  history: [
    { from: 'bot', text: "Hi! I'm Lumi, the Lumen & Co. virtual assistant. How can I help you today?", ago: 150 },
    { from: 'customer', text: 'cancel my order', ago: 135 },
    { from: 'bot', text: 'I can help with that! To find your order, please enter the email address you used.', ago: 130 },
    { from: 'customer', text: 'priya.raman@outlook.com', ago: 112 },
    { from: 'bot', text: "Thanks! I found 1 recent order on that email. I'm connecting you with an agent who can help with cancellations — please hold on.", ago: 106 },
    { from: 'system', text: 'Lumi transferred the conversation to you', ago: 1 }
  ],
  start: 'start',
  nodes: {
    start: {
      c: [],
      o: [
        { q: 3, t: "Hi Priya, thanks for waiting! I'm {agent} and I'll help you with the cancellation. For security, could you please confirm the billing ZIP code or the order number?", go: 'verified', r: ['Sure! ZIP is 97214.'], fb: 'Greeting + introduction + completing verification: the bot only collected the email, and guests need two details.' },
        { q: 0, t: "Hi Priya, no problem — I've gone ahead and cancelled your order for you.", retry: true, r: ["Wait… you didn't ask which order or check anything. Are you sure you got the right one?"], fb: 'Never act before verifying the customer and confirming the request. Guests need two verification details.' },
        { q: 2, t: 'Hello! Which order would you like to cancel?', go: 'verified', r: ['The one I placed this morning — LM-483377, the duvet set.'], fb: 'Works — the order number counts as the second verification detail. Introducing yourself makes it warmer.' },
        { q: 1, t: "Why do you want to cancel? Our linen is the best quality on the market — you won't regret keeping it!", retry: true, r: ["I just want to cancel, please. I don't need a sales pitch."], fb: "Don't push back or sell before helping. Acknowledge the request first." }
      ]
    },
    verified: {
      c: [],
      o: [
        { q: 3, t: "Thank you, you're verified. I see order LM-483377 placed this morning for the Linen Duvet Cover Set and Pillowcases ($142.20). It hasn't shipped yet, so I can cancel it free of charge. Would you like me to go ahead?", go: 'reason', fb: 'Confirms the exact order, its status and amount — and asks for consent before acting.' },
        { q: 0, t: "Thank you. Unfortunately your order has already shipped, so it can't be cancelled — you'd need to return it once it arrives.", retry: true, r: ["Shipped? I ordered it two hours ago. My confirmation email says 'Processing'."], fb: 'Wrong — the status is Processing. Always check the order status before answering.' },
        { q: 2, t: 'Thanks! Your order is still processing, so it can be cancelled. Shall I cancel it?', go: 'reason', fb: 'Correct. Restating the order details avoids cancelling the wrong thing.' }
      ]
    },
    reason: {
      c: ['Yes please. Honestly I found the same set cheaper somewhere else 😅'],
      o: [
        { q: 3, t: "Totally understand, thanks for letting me know! I've cancelled order LM-483377. You'll receive a confirmation email shortly, and the $142.20 will be released back to your Mastercard ending in 9012 within 3–5 business days.", go: 'code', fb: 'Accepts the reason gracefully and confirms the action, amount, card and timeframe.' },
        { q: 0, t: "Oh, we can price match! Send me the link to the other store and I'll lower your price instead.", retry: true, r: ["Really? Your FAQ says you don't match other stores' prices…"], fb: 'Lumen & Co. does not match competitor prices. Never invent offers.' },
        { q: 2, t: 'No problem, your order is cancelled. The money will be back in a few days.', go: 'code', fb: 'Correct — but give the amount, the card and the 3–5 business day window.' },
        { q: 1, t: "Are you sure? Once it's cancelled you won't be able to get it back.", retry: true, r: ["Yes, I'm sure. Please just cancel it."], fb: "Unnecessary friction. Respect the customer's decision." }
      ]
    },
    code: {
      c: ['Perfect, thanks!', 'Oh — I used the WELCOME10 code on that order. Do I lose it?'],
      o: [
        { q: 3, t: 'Good question! Since the order was cancelled, the code will be restored to your account within 24 hours, so you can use it on a future order.', go: 'close', fb: 'Accurate: single-use codes from cancelled orders are restored within 24 hours.' },
        { q: 0, t: 'Unfortunately promo codes are single-use, so that one has been used up.', retry: true, r: ["Hmm, even though the order was cancelled? That doesn't sound right."], fb: "Wrong — codes from cancelled orders are restored within 24 hours. Check the knowledge base when you're unsure." },
        { q: 1, t: "I'm not sure — you could try using it again and see if it works.", go: 'close', r: ["Okay… I guess I'll try 🤷‍♀️"], fb: "If you don't know, look it up in the knowledge base instead of guessing." }
      ]
    },
    close: {
      c: ["Great, that's good to know. Thanks for the help!"],
      o: [
        { q: 3, t: "You're welcome, Priya! Is there anything else I can help you with today?", go: 'end', fb: 'Complete close: friendly and offers further help.' },
        { q: 2, t: 'Happy to help — have a lovely day!', go: 'end_short', fb: "Polite. Asking if there's anything else is the standard close." },
        { q: 1, t: 'Ok.', go: 'end_cold', fb: 'Too short — it feels like you want her gone.' }
      ]
    },
    end: { c: ["Nope, that's all. Have a great day!"], end: 'resolved' },
    end_short: { c: ['You too!'], end: 'resolved' },
    end_cold: { c: ['…ok, bye.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd1-marcus', day: 1, arrive: 70, replyIn: 10, persona: 'neutral',
  channel: 'web', verified: false, verifyNote: 'Guest chat — not signed in', priority: 'Medium',
  topic: 'Change delivery address', disp: ['order-change'],
  customer: {
    first: 'Marcus', last: 'Bell', photo: 'men/75', location: 'Columbus, Ohio',
    email: 'marcus.bell88@yahoo.com', phone: '+1 (614) 555-0172', since: '2022-07-09',
    plan: 'Lumen Plus', ltv: '$1,286.40', orders: 14, tags: ['Lumen Plus', 'Frequent buyer']
  },
  sections: [
    {
      title: 'Order LM-483120', icon: 'box', rows: [
        { note: 'Guest chat — verify two details before sharing or changing anything on this order.', tone: 'warning' },
        ['Status', { pill: 'Processing', tone: 'warning' }],
        ['Placed', { date: '2026-11-01', time: '7:52 PM' }],
        ['Ships', { date: '2026-11-03' }],
        { items: [{ name: 'Cast Iron Dutch Oven 6 qt', meta: 'Lavender · Qty 1', price: '$89.00', stock: 'In stock · 12 units', tone: 'success' }] },
        ['Shipping', 'Express (2–3 business days) · Free with Lumen Plus'],
        ['Tax', '$6.68'],
        ['Total', { strong: '$95.68' }],
        ['Payment', 'PayPal'],
        ['Ship to', '455 E Town St, Apt 3B, Columbus, OH 43215'],
        ['Billing ZIP', '43215']
      ]
    }
  ],
  timeline: [
    ['Nov 1 · 7:52 PM', 'Order placed'],
    ['Nov 1 · 7:52 PM', 'Payment approved — PayPal'],
    ['Nov 3 (scheduled)', 'Ships from Columbus warehouse — Express', 'warning']
  ],
  policies: ['verification', 'orders', 'shipping'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['hey, I need to change the delivery address on my order', 'I just moved and I put my old address by mistake 🤦‍♂️'],
      o: [
        { q: 3, t: "Hi! I can definitely help with that. Since you're chatting as a guest, I first need to verify your identity — could you share the email on your account and your order number?", go: 'verify', fb: 'Correct: guest chats aren\'t verified, and policy requires two details (e.g., email + order number) before changing an order.' },
        { q: 1, t: "Sure! What's the new address?", go: 'addr_first', fb: "Helpful, but you're about to change an order for someone you haven't verified. Verify guests first." },
        { q: 2, t: 'Hi, sorry about that! Could you share your email and order number?', go: 'verify', fb: 'Right request. Explaining WHY you need it (guest verification) makes it feel less like an interrogation.' },
        { q: 0, t: "Unfortunately addresses can't be changed once an order is placed. You'll need to cancel it and order again.", retry: true, r: ["Really? It hasn't even shipped yet…"], fb: 'Wrong — address changes are allowed while the order is Processing (after verification).' }
      ]
    },
    verify: {
      c: ['Sure — marcus.bell88@yahoo.com and the order is LM-483120'],
      o: [
        { q: 3, t: "Thanks, Marcus — you're verified ✅ Good news: your order hasn't shipped yet, so I can update it. What's the new address, including apartment number and ZIP code?", go: 'new_addr', fb: 'Confirms verification and that the change is possible, then asks for the complete address.' },
        { q: 2, t: "Thanks. What's the new address?", go: 'new_addr', fb: "Fine. Letting him know he's verified and that the change is possible is reassuring." },
        { q: 0, t: "Hmm, that email doesn't match the one on this order, so I'm not able to make changes.", retry: true, r: ["What? That's the only email I use… it's on my order confirmation."], fb: "The email matches the account in Contact info. Don't invent a mismatch — read the panel carefully." }
      ]
    },
    new_addr: {
      c: ['1180 Neil Ave, Apt 12, Columbus, OH 43201'],
      o: [
        { q: 3, t: "Thank you! I've updated the shipping address on order LM-483120 to: 1180 Neil Ave, Apt 12, Columbus, OH 43201. Could you confirm that's correct?", go: 'ship', fb: 'Reading the address back prevents costly delivery mistakes.' },
        { q: 1, t: "Done, it's updated!", go: 'ship', r: ['Cool… you got the apartment number too, right? lol'], fb: 'Always read the new address back to the customer to confirm it.' },
        { q: 0, t: "Thank you! I've updated the address to 1180 Neil Ave, Columbus, OH 43215. Could you confirm that's correct?", retry: true, r: ["No no — the ZIP is 43201 and you're missing Apt 12!"], fb: 'Accuracy matters: 43215 is his OLD ZIP and the apartment number is missing.' }
      ]
    },
    addr_first: {
      c: ['1180 Neil Ave, Apt 12, Columbus, OH 43201'],
      o: [
        { q: 3, t: "Thanks! Before I make the change I need to verify your identity, since you're chatting as a guest. Could you confirm the email on your account and the order number?", go: 'verify_late', fb: 'Good recovery — verify before making any change.' },
        { q: 0, t: 'Done — your shipping address has been updated! 🎉', retry: true, r: ["Oh nice. Wait — you didn't ask anything about me. Is that… safe? 😬"], fb: 'Security risk: you changed an order for an unverified guest. Always verify two details first.' }
      ]
    },
    verify_late: {
      c: ['Sure — marcus.bell88@yahoo.com, order LM-483120'],
      o: [
        { q: 3, t: "Thank you, Marcus, you're verified. I've updated order LM-483120 to ship to 1180 Neil Ave, Apt 12, Columbus, OH 43201. Could you confirm that's correct?", go: 'ship', fb: 'Verified, updated and read back.' },
        { q: 1, t: 'Thanks, all updated.', go: 'ship', r: ['Cool… you got the apartment number right?'], fb: 'Read the new address back to confirm it.' }
      ]
    },
    ship: {
      c: ["Yep, that's right. Will it still get here on time? I paid for express."],
      o: [
        { q: 3, t: "Yes! It's scheduled to ship tomorrow, Nov 3, with Express shipping (2–3 business days), so you should have it by Thursday, Nov 5 or Friday, Nov 6. And Express is free with your Lumen Plus membership, so there's no extra charge.", go: 'close', fb: 'Accurate timeline from the order panel and policy, plus a nice membership reminder.' },
        { q: 0, t: "Yes — Express takes 2–3 days, so it'll be at your new place tomorrow!", retry: true, r: ["Tomorrow? I thought it hadn't shipped yet…"], fb: 'Wrong: it ships Nov 3, then Express takes 2–3 business days → Nov 5–6.' },
        { q: 2, t: 'Yes, Express shipping takes 2–3 business days once it ships.', go: 'close', fb: 'Correct but incomplete — give the ship date and the delivery window.' }
      ]
    },
    close: {
      c: ['Awesome, thanks for the quick help!'],
      o: [
        { q: 3, t: 'My pleasure, Marcus — enjoy the new place! Is there anything else I can help you with?', go: 'end', fb: 'Personal touch and a proper close.' },
        { q: 2, t: 'No problem. Have a good one!', go: 'end_short', fb: "Friendly. Don't forget to ask if there's anything else." },
        { q: 1, t: 'k', go: 'end_cold', fb: "One letter isn't a professional close." }
      ]
    },
    end: { c: ["That's all, thanks! 👍"], end: 'resolved' },
    end_short: { c: ['You too!'], end: 'resolved' },
    end_cold: { c: ['ok bye'], end: 'resolved' }
  }
});

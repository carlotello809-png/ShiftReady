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
        { q: 0, t: "Hi Daniel, thanks for reaching out, and sorry the wait is dragging on! Orders usually take 5–7 business days to arrive, so if you give it a few more days it should show up at your door. If it still hasn't arrived after that, just message us again and we'll look into it.", retry: true, r: ["Okay… but it's been almost a week. Can you actually check where it is?"], fb: 'A generic answer without looking at his order. Always check the order details before responding.' },
        { q: 2, t: "Hi Daniel! I'm so sorry to hear your earbuds haven't arrived yet — I know how frustrating it is to wait for something you're excited about. Let me take a look into this for you right away, so one moment please.", go: 'tracking', fb: "Friendly and quick. Confirming which order you're looking at builds even more trust." }
      ]
    },
    tracking: {
      c: [],
      o: [
        { q: 3, t: "Good news — your earbuds shipped on Oct 30 with UPS and they're already at the UPS facility in Austin. The estimated delivery is this Wednesday, Nov 4. Your tracking number is 1Z84A9E20314772913.", go: 'why', fb: 'Clear, specific and accurate: ship date, carrier, current location, ETA and tracking number.' },
        { q: 0, t: "Good news — your Aria Wireless Earbuds shipped on Oct 28 with FedEx and they're out for delivery today, Nov 2, so they should reach you by this evening. Your tracking number is 1Z84A9E20314772913 if you'd like to follow along.", retry: true, r: ["Today? The app says Wednesday… and it's UPS, not FedEx. Are you looking at my order?"], fb: 'Polished but wrong: the order was placed Oct 28, shipped Oct 30 with UPS, and the ETA is Nov 4. Double-check the order panel.' },
        { q: 1, t: "It's in transit. You'll get it soon!", retry: true, r: ['Soon when? Do you have an actual date?'], fb: 'Too vague. Customers want specifics — give the ETA and the tracking number.' },
        { q: 2, t: "Thanks for waiting, Daniel! Your earbuds are on their way with UPS, and the estimated delivery date is Wednesday, Nov 4. You can follow every step of the delivery in the app under My Orders, and you'll get a notification when it's close.", go: 'why', fb: 'Accurate. Adding where it is right now and the tracking number would make it complete.' }
      ]
    },
    why: {
      c: ['Oh okay. I thought it would be faster though — I ordered it last Wednesday.', 'Why does it take so long?'],
      o: [
        { q: 3, t: "I understand, a week feels long! Your order used Standard shipping, which takes 5–7 business days — and weekends don't count. Wednesday, Nov 4 is the 5th business day, so it's right on schedule.", go: 'close', fb: 'Empathy plus a simple explanation of the policy, without blaming the customer.' },
        { q: 1, t: "That's because you chose the slowest shipping option at checkout.", go: 'close', r: ['Well… it was the free option 😕'], fb: "Technically true, but it sounds like you're blaming him. Explain shipping times neutrally." },
        { q: 0, t: "I'm really sorry it's taking longer than you expected — a week is a long wait! To make up for it, I'll upgrade your order to Next-day shipping at no cost, so your earbuds arrive tomorrow instead of Wednesday.", retry: true, r: ['Oh wow — can you even do that if it already shipped?'], fb: "Shipping speed can't be changed once the package is with the carrier. Never promise what you can't deliver." },
        { q: 2, t: "Your order was placed with Standard shipping, which takes 5–7 business days to arrive, and weekends and holidays aren't counted as business days. Wednesday, Nov 4 is therefore within the expected delivery time for this shipping method.", go: 'close', fb: 'Correct. A touch of empathy would make it land better.' }
      ]
    },
    close: {
      c: ['Got it, that makes sense. Wednesday works for me 👍'],
      o: [
        { q: 3, t: "Great! You'll get a notification in the app as soon as it's out for delivery. Is there anything else I can help you with today?", go: 'end', fb: 'Sets an expectation and offers more help — a strong close.' },
        { q: 2, t: "Perfect — glad I could help, Daniel! Your earbuds are on their way and the app will keep you posted at every step, so you're all set. Thanks for choosing Lumen & Co. and have a great day!", go: 'end_short', fb: "Polite, but always ask if there's anything else before closing." },
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
        { q: 0, t: "Hi Priya, thanks so much for waiting, and no problem at all — I know it's annoying to change your mind after ordering. I've gone ahead and cancelled your order for you right away, and you'll get a cancellation email in the next few minutes.", retry: true, r: ["Wait… you didn't ask which order or check anything. Are you sure you got the right one?"], fb: 'Never act before verifying the customer and confirming the request. Guests need two verification details.' },
        { q: 2, t: 'Hello! Which order would you like to cancel?', go: 'verified', r: ['The one I placed this morning — LM-483377, the duvet set.'], fb: 'Works — the order number counts as the second verification detail. Introducing yourself makes it warmer.' },
        { q: 1, t: "Hi Priya, thanks for waiting! Before we cancel, may I ask why you want to? Our linen is honestly the best quality on the market — it gets softer with every wash and lasts for years — so I really think you won't regret keeping it!", retry: true, r: ["I just want to cancel, please. I don't need a sales pitch."], fb: "Don't push back or sell before helping. Acknowledge the request first." }
      ]
    },
    verified: {
      c: [],
      o: [
        { q: 3, t: "Thank you, you're verified. I see order LM-483377 placed this morning for the Linen Duvet Cover Set and Pillowcases ($142.20). It hasn't shipped yet, so I can cancel it free of charge. Would you like me to go ahead?", go: 'reason', fb: 'Confirms the exact order, its status and amount — and asks for consent before acting.' },
        { q: 0, t: "Thank you, you're verified. I've checked order LM-483377, and unfortunately it has already shipped from our Portland warehouse, so it can't be cancelled anymore. Once it arrives you can start a return from your account, and we'll refund you as soon as it's back with us.", retry: true, r: ["Shipped? I ordered it two hours ago. My confirmation email says 'Processing'."], fb: 'Wrong — the status is Processing. Always check the order status before answering.' },
        { q: 2, t: "Thanks so much, Priya, you're all verified now! Good news: your order is still processing and hasn't left the warehouse, so it can be cancelled free of charge without any problem at all. Shall I go ahead and cancel it for you now?", go: 'reason', fb: 'Correct. Restating the order details avoids cancelling the wrong thing.' }
      ]
    },
    reason: {
      c: ['Yes please. Honestly I found the same set cheaper somewhere else 😅'],
      o: [
        { q: 3, t: "Totally understand, thanks for letting me know! I've cancelled order LM-483377. You'll receive a confirmation email shortly, and the $142.20 will be released back to your Mastercard ending in 9012 within 3–5 business days.", go: 'code', fb: 'Accepts the reason gracefully and confirms the action, amount, card and timeframe.' },
        { q: 0, t: "Totally understand, and thanks for being upfront about it! Before you cancel, here's some good news: we can price match. Just send me the link to the other store's listing and I'll lower the price of your duvet set and pillowcases to match, so you can keep your order.", retry: true, r: ["Really? Your FAQ says you don't match other stores' prices…"], fb: 'Lumen & Co. does not match competitor prices. Never invent offers.' },
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
        { q: 2, t: 'Happy to help, Priya! Your cancellation is all done and your WELCOME10 code will be back in your account soon. Thanks for shopping with Lumen & Co. — have a lovely day!', go: 'end_short', fb: "Polite. Asking if there's anything else is the standard close." },
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
        { q: 2, t: 'Hi, sorry about the mix-up — moving is hectic enough without delivery problems! I can definitely look into changing that for you. Could you please share the email address on your account and the order number for this order?', go: 'verify', fb: 'Right request. Explaining WHY you need it (guest verification) makes it feel less like an interrogation.' },
        { q: 0, t: "Hi Marcus, sorry about the mix-up — moving is hectic! Unfortunately, once an order has been placed the shipping address is locked in our system, so I'm not able to change it. The quickest fix is to cancel this order and place a new one with your new address.", retry: true, r: ["Really? It hasn't even shipped yet…"], fb: 'Wrong — address changes are allowed while the order is Processing (after verification).' }
      ]
    },
    verify: {
      c: ['Sure — marcus.bell88@yahoo.com and the order is LM-483120'],
      o: [
        { q: 3, t: "Thanks, Marcus — you're verified ✅ Good news: your order hasn't shipped yet, so I can update it. What's the new address, including apartment number and ZIP code?", go: 'new_addr', fb: 'Confirms verification and that the change is possible, then asks for the complete address.' },
        { q: 2, t: "Thanks for sending those over, Marcus, I really appreciate it. To get the delivery sorted out for you, what's the new address you'd like me to use? Please include the street, any apartment number, the city and the ZIP code.", go: 'new_addr', fb: "Fine. Letting him know he's verified and that the change is possible is reassuring." },
        { q: 0, t: "Thanks for sending those over, Marcus. I've checked order LM-483120, but the email you gave me doesn't match the one we have on file for this order, so for your security I'm not able to make any changes to it right now.", retry: true, r: ["What? That's the only email I use… it's on my order confirmation."], fb: "The email matches the account in Contact info. Don't invent a mismatch — read the panel carefully." }
      ]
    },
    new_addr: {
      c: ['1180 Neil Ave, Apt 12, Columbus, OH 43201'],
      o: [
        { q: 3, t: "Thank you! I've updated the shipping address on order LM-483120 to: 1180 Neil Ave, Apt 12, Columbus, OH 43201. Could you confirm that's correct?", go: 'ship', fb: 'Reading the address back prevents costly delivery mistakes.' },
        { q: 1, t: "All done — I've updated the shipping address on order LM-483120, so your Dutch oven will now be delivered to your new place instead of the old one. You'll get an email confirming the change shortly.", go: 'ship', r: ['Cool… you got the apartment number too, right? lol'], fb: 'Always read the new address back to the customer to confirm it.' },
        { q: 0, t: "Thank you, Marcus! All done — I've updated the shipping address on order LM-483120 to 1180 Neil Ave, Columbus, OH 43215, so your Dutch oven will go straight to the new place. Could you confirm that's correct?", retry: true, r: ["No no — the ZIP is 43201 and you're missing Apt 12!"], fb: 'Accuracy matters: 43215 is his OLD ZIP and the apartment number is missing.' }
      ]
    },
    addr_first: {
      c: ['1180 Neil Ave, Apt 12, Columbus, OH 43201'],
      o: [
        { q: 3, t: "Thanks! Before I make the change I need to verify your identity, since you're chatting as a guest. Could you confirm the email on your account and the order number?", go: 'verify_late', fb: 'Good recovery — verify before making any change.' },
        { q: 0, t: "Got it, thanks Marcus! All done — I've updated the shipping address on your order to 1180 Neil Ave, Apt 12, Columbus, OH 43201, so your package will head straight to the new place. Congrats on the move! 🎉", retry: true, r: ["Oh nice. Wait — you didn't ask anything about me. Is that… safe? 😬"], fb: 'Security risk: you changed an order for an unverified guest. Always verify two details first.' }
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
        { q: 0, t: "Yes, absolutely! Express shipping takes 2–3 days and your order is all set with the new address, so it'll be at your new place tomorrow. And since you're a Lumen Plus member, the Express shipping doesn't cost you anything extra.", retry: true, r: ["Tomorrow? I thought it hadn't shipped yet…"], fb: 'Wrong: it ships Nov 3, then Express takes 2–3 business days → Nov 5–6.' },
        { q: 2, t: 'Yes, Express shipping takes 2–3 business days once it ships.', go: 'close', fb: 'Correct but incomplete — give the ship date and the delivery window.' }
      ]
    },
    close: {
      c: ['Awesome, thanks for the quick help!'],
      o: [
        { q: 3, t: 'My pleasure, Marcus — enjoy the new place! Is there anything else I can help you with?', go: 'end', fb: 'Personal touch and a proper close.' },
        { q: 2, t: 'No problem at all, Marcus — moving is stressful enough without delivery mix-ups! Your order is on its way to the new address. Have a good one and enjoy settling in!', go: 'end_short', fb: "Friendly. Don't forget to ask if there's anything else." },
        { q: 1, t: 'k', go: 'end_cold', fb: "One letter isn't a professional close." }
      ]
    },
    end: { c: ["That's all, thanks! 👍"], end: 'resolved' },
    end_short: { c: ['You too!'], end: 'resolved' },
    end_cold: { c: ['ok bye'], end: 'resolved' }
  }
});

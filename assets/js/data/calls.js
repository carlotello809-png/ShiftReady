/* PHONE CALLS — played only in "Chats + calls" shifts.
   Same format as the chat cases (see day1.js), with two differences:
     level   which days get the call: 1 = Easy days (1–2), 2 = Medium (3), 3 = Hard and Expert (4–5)
     channel always 'phone'
   The caller's lines (c, r) are read aloud by the browser, so they avoid emoji and symbols.
   Calls go through the phone menu first: verifyNote says what it already confirmed. */
window.SR = window.SR || {};
SR.data = SR.data || {};
SR.data.calls = SR.data.calls || [];
SR.call = function (s) { SR.data.calls.push(s); };

/* ---------- Level 1 · Easy days ---------- */

SR.call({
  id: 'call-rosa', level: 1, persona: 'calm',
  channel: 'phone', verified: false, verifyNote: 'Caller ID matches the phone on file (1 of 2 details)', priority: 'Low',
  topic: 'When does my Express order arrive?', disp: ['order-status'],
  customer: {
    first: 'Rosa', last: 'Delgado', photo: 'women/12', location: 'Miami, Florida',
    email: 'rosa.delgado@gmail.com', phone: '+1 (305) 555-0172', since: '2025-06-09',
    plan: 'Standard', ltv: '$186.40', orders: 3, tags: ['Phone customer']
  },
  sections: [
    {
      title: 'Order LM-485010', icon: 'box', rows: [
        ['Status', { pill: 'Shipped', tone: 'info' }],
        ['Placed', { date: '2026-10-31', time: '6:22 PM' }],
        { items: [{ name: 'Galaxy Star Projector', meta: 'Black · Qty 1 · SKU GS-1180', price: '$39.99', stock: 'In stock · 61 units', tone: 'success' }] },
        ['Subtotal', '$39.99'],
        ['Shipping', 'Express (2–3 business days) · $14.99'],
        ['Tax', '$3.81'],
        ['Total', { strong: '$58.79' }],
        ['Payment', 'Visa •••• 2290'],
        ['Billing ZIP', '33130']
      ]
    },
    {
      title: 'Shipment', icon: 'truck', rows: [
        ['Carrier', 'FedEx Express'],
        ['Tracking', { mono: '7789 2210 4431' }],
        ['Shipped', { date: '2026-11-02' }],
        ['Est. delivery', { date: '2026-11-04' }],
        ['Delivery window', 'Set by FedEx on the day'],
        ['Ship to', '1450 Brickell Ave, Apt 2204, Miami, FL 33131']
      ]
    }
  ],
  timeline: [
    ['Oct 31 · 6:22 PM', 'Order placed with Express shipping'],
    ['Nov 2 · 7:40 AM', 'Shipped with FedEx Express', 'info'],
    ['Nov 2 · 9:12 AM', 'Departed FedEx hub — Memphis, TN', 'info']
  ],
  policies: ['verification', 'shipping', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hi. Um, I placed an order on Saturday, and I just want to know when it will arrive.'],
      o: [
        { q: 3, t: "Thanks for calling Lumen & Co., this is {agent}. I'd be glad to check that for you. I can see you're calling from the number on your account — could you also confirm your billing ZIP code or the order number, just to verify it's you?", go: 'verify', fb: 'Friendly opening with your name, and you ask for exactly one more detail: caller ID already counts as one of the two.' },
        { q: 0, t: "Of course! Your star projector is out for delivery today, so it should be at your door this afternoon.", retry: true, r: ["Wait, you didn't even ask who I am. And today? My email said Wednesday."], fb: "Two mistakes: you shared order details before verifying the caller, and the date is wrong (estimated delivery is Wednesday, Nov 4)." },
        { q: 1, t: 'Sure. Can I have your full card number so I can find the order?', retry: true, r: ["My card number? I'm not giving that over the phone."], fb: 'Never ask for a full card number. Verify with the email, order number, billing ZIP or phone on file.' },
        { q: 2, t: 'Hi! Sure, what is your order number, please?', go: 'verify', fb: 'Works, but introduce yourself and say why you need it. The billing ZIP would also verify her.' }
      ]
    },
    verify: {
      c: ["Sure, the ZIP code is 3 3 1 3 0. I don't have the order number in front of me."],
      o: [
        { q: 3, t: 'Thank you, Rosa, that matches — you\'re verified. Your order LM-485010, the Galaxy Star Projector, shipped on Monday, November 2 with FedEx Express. The estimated delivery is this Wednesday, November 4.', go: 'when', fb: 'Verified with two details (caller ID + ZIP), then specific: product, carrier, ship date and estimated delivery.' },
        { q: 0, t: 'Thanks, Rosa. Your order shipped on Monday with Standard shipping, so it should arrive in 5 to 7 business days.', retry: true, r: ['Standard? I paid for Express shipping.'], fb: 'Check the order: she paid $14.99 for Express (2–3 business days). The estimate is Wednesday, Nov 4.' },
        { q: 1, t: "I'm sorry, I can't verify you without the full order number.", retry: true, r: ['Oh. I thought my ZIP code and my phone number would be enough.'], fb: "They are: the phone on file and the billing ZIP are two of the four accepted details. Don't add steps the policy doesn't need." },
        { q: 2, t: "Thanks, you're verified. It shipped on Monday and it should arrive on Wednesday.", go: 'when', fb: 'Accurate. Adding the carrier and the date (Wednesday, Nov 4) makes it complete.' }
      ]
    },
    when: {
      c: ['Wednesday, perfect. Will it come in the morning? I have to go out after lunch.'],
      o: [
        { q: 3, t: "I can't promise a time — FedEx sets the delivery window on the day, and estimates can change. The tracking number is in your shipping email, so you can follow it on Wednesday morning. And if an Express order ever arrives late, we refund the Express fee.", go: 'close', fb: "Honest about what you can't control, gives her a way to follow it, and mentions the late-Express refund." },
        { q: 0, t: "Yes, Express always arrives before noon, so you'll be home for it.", retry: true, r: ['Always? Are you sure? I really cannot miss it.'], fb: 'Never guarantee a delivery time. FedEx sets the window; the policy says estimates come from the carrier.' },
        { q: 1, t: "No idea, that's up to FedEx.", go: 'close', r: ['Okay… I guess I will check.'], fb: 'True, but curt, and it pushes her to the carrier. Explain and give her the tracking.' },
        { q: 2, t: "FedEx doesn't give a time window in advance, but you can follow the package with the tracking link in your email.", go: 'close', fb: 'Good. Mentioning the late-Express refund would reassure her even more.' }
      ]
    },
    close: {
      c: ['Okay, that helps. Thank you.'],
      o: [
        { q: 3, t: "You're welcome, Rosa! Is there anything else I can help you with today?", go: 'end', fb: 'Confirms and offers more help — a strong close.' },
        { q: 2, t: 'Glad I could help, Rosa. Enjoy your projector and have a great day!', go: 'end_short', fb: "Warm, but always ask if there's anything else before you hang up." },
        { q: 1, t: 'Okay, bye.', go: 'end_cold', fb: 'Too abrupt. The goodbye is part of the experience.' }
      ]
    },
    end: { c: ["No, that's everything. Thank you, bye!"], end: 'resolved' },
    end_short: { c: ['Thanks, you too. Bye!'], end: 'resolved' },
    end_cold: { c: ['Okay. Bye.'], end: 'resolved' }
  }
});

SR.call({
  id: 'call-tom', level: 1, persona: 'neutral',
  channel: 'phone', verified: false, verifyNote: 'Caller ID matches the phone on file (1 of 2 details)', priority: 'Medium',
  topic: 'Forgot to use my promo code', disp: ['cancellation', 'promo'],
  customer: {
    first: 'Tom', last: 'Becker', photo: 'men/14', location: 'Columbus, Ohio',
    email: 'tom.becker@yahoo.com', phone: '+1 (614) 555-0193', since: '2024-01-22',
    plan: 'Standard', ltv: '$642.10', orders: 7, tags: ['Repeat customer']
  },
  sections: [
    {
      title: 'Order LM-485122', icon: 'box', rows: [
        ['Status', { pill: 'Processing', tone: 'warning' }],
        ['Placed', { date: '2026-11-02', time: '8:05 AM' }],
        { items: [{ name: 'Vortex Pro Blender 1400W', meta: 'Graphite · Qty 1', price: '$129.00', stock: 'In stock · 23 units', tone: 'success' }] },
        ['Subtotal', '$129.00'],
        ['Promo code', 'None'],
        ['Shipping', 'Standard · Free'],
        ['Tax', '$9.35'],
        ['Total', { strong: '$138.35' }],
        ['Payment', 'Mastercard •••• 6604 · authorization hold']
      ]
    },
    {
      title: 'Promotions on the account', icon: 'gift', rows: [
        ['BLEND20', '20% off blenders · single use · valid until Nov 8'],
        ['Status', { pill: 'Unused', tone: 'success' }],
        ['Saving on this order', '$25.80 (20% of $129.00)']
      ]
    }
  ],
  timeline: [
    ['Oct 30', 'Email campaign: BLEND20 sent'],
    ['Nov 2 · 8:05 AM', 'Order placed without a promo code'],
    ['Nov 4 (scheduled)', 'Ships from Columbus warehouse', 'warning']
  ],
  policies: ['verification', 'promotions', 'orders'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hi there. I just ordered a blender on your website, and I forgot to put in my promo code. Can you add it for me?'],
      o: [
        { q: 3, t: "Thanks for calling Lumen & Co., this is {agent}. Let's see what we can do. You're calling from the number on file — can you also confirm the email address on your account or the order number, so I can verify it's you?", go: 'verify', fb: 'Introduces yourself and asks for one more detail to verify, without promising anything yet.' },
        { q: 0, t: "Sure, I've added the code to your order. You'll see the discount on your receipt.", retry: true, r: ["Oh, great! Wait… don't you need my order number or anything?"], fb: "Agents can't apply codes to orders that were already placed — and you haven't verified the caller." },
        { q: 1, t: "Sorry, promo codes can't be added after an order is placed.", retry: true, r: ["So I just lose the discount? That's twenty-five dollars."], fb: 'True, but it stops there. The order is still Processing — there is an honest way to help.' },
        { q: 2, t: 'I can look into that. What is the email on your account?', go: 'verify', fb: 'Fine. Introduce yourself first so the caller knows who they are talking to.' }
      ]
    },
    verify: {
      c: ["It's tom.becker@yahoo.com. The code is BLEND20, it came in an email."],
      o: [
        { q: 3, t: "Thanks, Tom, you're verified. I can't add a code to an order that's already placed. But your order LM-485122 is still Processing, so I can cancel it for free, and you can place it again with BLEND20. That saves you $25.80.", go: 'confirm', fb: 'Explains the rule and finds the honest way to help: free cancellation while Processing, then reorder with the code.' },
        { q: 0, t: "Thanks, Tom. I can't add codes, but I'll give you 20% back as store credit instead.", retry: true, r: ["Store credit? I'd rather have the real discount."], fb: "Agents can't override or replace promo codes, and goodwill credit is only for service failures." },
        { q: 1, t: "Thanks. Your order has already shipped, so there's nothing I can do.", retry: true, r: ['Shipped? I only ordered it a little while ago.'], fb: 'Wrong: the status is Processing (it ships Nov 4). Check the order before answering.' },
        { q: 2, t: "Thanks, you're verified. I can't add the code, but I can cancel the order so you can reorder with it.", go: 'confirm', fb: 'Good. Say why it works (still Processing) and how much the code saves.' }
      ]
    },
    confirm: {
      c: ['Okay, cancel it then. Will I be charged twice if I order again?'],
      o: [
        { q: 3, t: "No, you won't. Order LM-485122 is cancelled now. We only charge when an order ships, so the $138.35 hold on your card is released within 3 to 5 business days. BLEND20 is still unused, so it will work on your new order.", go: 'close', fb: 'Clear and exact: no double charge, the hold is released in 3–5 business days, and the code still works.' },
        { q: 0, t: 'Done. The $138.35 will be refunded to your card tonight.', retry: true, r: ["Tonight? Okay… but I haven't been charged yet, have I?"], fb: "He wasn't charged: it's an authorization hold, released in 3–5 business days. Don't promise what the bank controls." },
        { q: 1, t: "It's cancelled. You might see two charges, but one goes away eventually.", go: 'close', r: ['Eventually? Okay…'], fb: 'Vague and worrying. Give the 3–5 business days and explain it is a hold, not a charge.' },
        { q: 2, t: "It's cancelled. The hold on your card drops off in 3 to 5 business days.", go: 'close', fb: 'Accurate. Confirming that the code still works would close the loop.' }
      ]
    },
    close: {
      c: ["Perfect. That's what I needed."],
      o: [
        { q: 3, t: 'Great! Is there anything else I can help you with today, Tom?', go: 'end', fb: 'Offers more help before ending the call.' },
        { q: 2, t: 'Glad I could help, Tom. Have a good day!', go: 'end_short', fb: "Polite, but ask if there's anything else first." },
        { q: 1, t: 'Ok, bye.', go: 'end_cold', fb: 'Too abrupt for a customer you just helped.' }
      ]
    },
    end: { c: ["No, that's it. Thanks a lot!"], end: 'resolved' },
    end_short: { c: ['Thanks, you too.'], end: 'resolved' },
    end_cold: { c: ['Okay. Bye.'], end: 'resolved' }
  }
});

/* ---------- Level 2 · Medium days ---------- */

SR.call({
  id: 'call-nadia', level: 2, persona: 'anxious',
  channel: 'phone', verified: true, verifyNote: 'Verified by the phone menu: caller ID and order number', priority: 'Medium',
  topic: 'Item missing from my box', disp: ['order-status'],
  customer: {
    first: 'Nadia', last: 'Petrov', photo: 'women/36', location: 'Denver, Colorado',
    email: 'nadia.petrov@outlook.com', phone: '+1 (720) 555-0164', since: '2023-09-14',
    plan: 'Standard', ltv: '$911.75', orders: 11, tags: ['Repeat customer']
  },
  sections: [
    {
      title: 'Order LM-485377', icon: 'box', rows: [
        ['Status', { pill: 'Partly delivered', tone: 'info' }],
        ['Placed', { date: '2026-10-30', time: '7:48 PM' }],
        {
          items: [
            { name: 'Stoneware Dinner Plates (Set of 4)', meta: 'Sand · Qty 1 · Package 1', price: '$64.00', stock: 'Delivered Nov 3', tone: 'success' },
            { name: 'Stoneware Mugs (Set of 2)', meta: 'Sand · Qty 1 · Package 1', price: '$28.00', stock: 'Delivered Nov 3', tone: 'success' },
            { name: 'Chunky Knit Throw Blanket', meta: 'Ivory · Qty 1 · Package 2', price: '$59.00', stock: 'In transit', tone: 'info' }
          ]
        },
        ['Subtotal', '$151.00'],
        ['Shipping', 'Standard · Free'],
        ['Total', { strong: '$162.33' }],
        ['Payment', 'Visa •••• 7718']
      ]
    },
    {
      title: 'Shipments (2 packages)', icon: 'truck', rows: [
        ['Package 1', 'Plates + mugs · Denver warehouse · UPS · Delivered Nov 3'],
        ['Package 2', 'Throw blanket · Columbus warehouse · UPS'],
        ['Tracking (pkg 2)', { mono: '1Z77B1E40362205117' }],
        ['Shipped (pkg 2)', { date: '2026-11-03' }],
        ['Est. delivery (pkg 2)', { date: '2026-11-06' }],
        { note: 'Split shipment: items ship from the warehouse that has them. No extra cost.' }
      ]
    }
  ],
  timeline: [
    ['Oct 30 · 7:48 PM', 'Order placed'],
    ['Nov 2', 'Package 1 shipped from Denver', 'info'],
    ['Nov 3 · 1:15 PM', 'Package 1 delivered', 'success'],
    ['Nov 3 · 4:30 PM', 'Package 2 shipped from Columbus', 'info']
  ],
  policies: ['shipping', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi, I got my order yesterday, but the blanket isn't in the box. Just the plates and the mugs. Did you forget it?"],
      o: [
        { q: 3, t: "I'm sorry for the worry, Nadia. This is {agent}, and I'll check that right now — I have your order LM-485377 here.", go: 'check', fb: 'Acknowledges the worry, introduces yourself and goes straight to her order (the phone menu already verified her).' },
        { q: 0, t: "I'm so sorry! I'll send you a new blanket right away.", retry: true, r: ['Oh, okay… but are you sure it is actually missing?'], fb: 'Check the order first: the blanket is in a second package that is already on its way.' },
        { q: 1, t: 'Did you check the box carefully? Sometimes items hide under the packing paper.', retry: true, r: ['Yes, I checked. Twice.'], fb: 'Sounds like you doubt her. The order panel shows a split shipment — look before asking.' },
        { q: 2, t: 'Let me take a look at your order.', go: 'check', fb: 'Fine. A word of empathy and your name make a better start.' }
      ]
    },
    check: {
      c: [],
      o: [
        { q: 3, t: "Good news: nothing was forgotten. Your order shipped in two packages from two warehouses. The plates and mugs came from Denver, and the blanket is coming from Columbus with UPS. It's due on Friday, November 6, and split shipments never cost extra.", go: 'friday', fb: 'Explains the split shipment, gives the carrier and date, and says it costs nothing extra.' },
        { q: 0, t: 'It looks like the blanket was out of stock, so we removed it from your order and refunded it.', retry: true, r: ['Refunded? I never got an email about that.'], fb: 'Wrong: the blanket is in package 2, shipped Nov 3, due Nov 6. Read the shipments card.' },
        { q: 1, t: "The blanket's coming separately.", go: 'friday', r: ['Separately? When?'], fb: 'Too vague. Say why (two warehouses) and when (Friday, Nov 6).' },
        { q: 2, t: 'Your order was split into two packages. The blanket is in the second one, due on Friday, November 6.', go: 'friday', fb: 'Accurate. Adding that it ships from another warehouse at no extra cost answers her next question.' }
      ]
    },
    friday: {
      c: ["Friday? It's a gift for my mom, and I'm seeing her on Saturday morning. Will it really make it?"],
      o: [
        { q: 3, t: "I understand. Friday is the carrier's estimate, so I can't guarantee it, but it's on track and already moving. I'll text you the UPS tracking number so you can follow it, and if anything changes, call us and we'll help right away.", go: 'close', fb: "Honest (no guarantee), reassuring, and gives her a way to follow it and a next step." },
        { q: 0, t: "Absolutely, I guarantee it'll be there on Friday.", retry: true, r: ['You guarantee it? You can promise that?'], fb: 'Never guarantee a delivery date: estimates come from the carrier.' },
        { q: 1, t: "Can't say. You'd have to ask UPS.", go: 'close', r: ['Okay…'], fb: 'Sends her away. Give her the tracking and tell her what happens if it is late.' },
        { q: 2, t: 'Based on the tracking, it should arrive on Friday.', go: 'close', fb: 'Good. Offer the tracking number and a next step in case it is late.' }
      ]
    },
    close: {
      c: ["Okay, thank you. That's a relief."],
      o: [
        { q: 3, t: "You're welcome, Nadia. Is there anything else I can help you with today?", go: 'end', fb: 'Offers more help before ending the call.' },
        { q: 2, t: 'Happy to help. I hope your mom loves the blanket!', go: 'end_short', fb: "Warm, but ask if there's anything else first." },
        { q: 1, t: 'Okay. Bye.', go: 'end_cold', fb: 'Too abrupt after a worried call.' }
      ]
    },
    end: { c: ["No, that's all. Thank you so much!"], end: 'resolved' },
    end_short: { c: ['Me too! Thank you, bye.'], end: 'resolved' },
    end_cold: { c: ['Bye.'], end: 'resolved' }
  }
});

SR.call({
  id: 'call-omar', level: 2, persona: 'neutral',
  channel: 'phone', verified: false, verifyNote: 'Caller ID matches the phone on file (1 of 2 details)', priority: 'Medium',
  topic: 'Lamp arrived cracked', disp: ['replacement'],
  customer: {
    first: 'Omar', last: 'Haddad', photo: 'men/60', location: 'Phoenix, Arizona',
    email: 'omar.haddad@gmail.com', phone: '+1 (602) 555-0139', since: '2025-02-03',
    plan: 'Standard', ltv: '$248.00', orders: 4, tags: []
  },
  sections: [
    {
      title: 'Order LM-485602', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-29', time: '12:30 PM' }],
        { items: [{ name: 'Ceramic Table Lamp', meta: 'Glazed white · Qty 1', price: '$89.00', stock: 'In stock · 17 units', tone: 'success' }] },
        ['Subtotal', '$89.00'],
        ['Shipping', 'Standard · Free'],
        ['Tax', '$7.39'],
        ['Total', { strong: '$96.39' }],
        ['Payment', 'Amex •••• 1009'],
        ['Billing ZIP', '85004'],
        ['Delivered', { date: '2026-11-03', time: '3:05 PM' }]
      ]
    }
  ],
  timeline: [
    ['Oct 29 · 12:30 PM', 'Order placed'],
    ['Oct 30', 'Shipped with UPS Ground', 'info'],
    ['Nov 3 · 3:05 PM', 'Delivered — left at front door', 'success']
  ],
  policies: ['damaged', 'verification', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi, I got a table lamp from you yesterday, and the base is cracked right down the side. I'm pretty disappointed."],
      o: [
        { q: 3, t: "I'm sorry, Omar, that's disappointing. This is {agent}, and I'll get it sorted out. You're calling from the number on file — can you also confirm your billing ZIP code or the order number?", go: 'verify', fb: 'Empathy, your name, and one more detail to verify before you change anything.' },
        { q: 0, t: 'No problem, a new lamp is already on its way.', retry: true, r: ["Already? Don't you need to know which order it is?"], fb: 'Verify first, and ask for a photo of the damage before you send anything.' },
        { q: 1, t: 'Was it cracked when it arrived, or did it happen afterwards?', retry: true, r: ['When it arrived! I just opened the box.'], fb: 'It sounds like you doubt him. A photo is enough — the policy does the checking.' },
        { q: 2, t: "Sorry about that. What's your order number?", go: 'verify', fb: 'Fine. Introduce yourself; the billing ZIP would also verify him.' }
      ]
    },
    verify: {
      c: ['The ZIP is 8 5 0 0 4.'],
      o: [
        { q: 3, t: "Thank you, you're verified. I see order LM-485602, the Ceramic Table Lamp, delivered on November 3, so you're well within the 7 days to report damage. I'm texting you a link now — could you upload a photo of the crack? Then you can choose a replacement or a full refund.", go: 'choose', fb: 'Confirms the window, asks for the photo in a way that works on the phone, and gives him the choice.' },
        { q: 0, t: "Thanks. Damage has to be reported within 24 hours of delivery, so unfortunately I can't help.", retry: true, r: ['Twenty-four hours? It came yesterday afternoon!'], fb: 'Wrong: damage can be reported within 7 days of delivery.' },
        { q: 1, t: "Thanks. Please email us a photo and we'll get back to you in a few days.", go: 'choose', r: ["A few days? Can't you fix it now?"], fb: 'Slow and vague. You can take the photo during the call and ship the replacement today.' },
        { q: 2, t: "Thanks, you're verified. Could you send a photo of the damage? Then I can send a replacement or a refund.", go: 'choose', fb: 'Good. Say how he can send the photo while you are on the phone.' }
      ]
    },
    choose: {
      c: ["Okay, I sent the photo. I'd like a new one, please. Do I have to send the broken one back first?"],
      o: [
        { q: 3, t: "Got it, thank you — that's clearly damaged. Your replacement ships today with free Express shipping, so you don't wait for the return. I'm emailing you a prepaid label for the broken lamp; you have 30 days to send it back.", go: 'close', fb: 'Exactly the policy: replacement ships now (free Express before 2 PM), prepaid label, 30 days.' },
        { q: 0, t: "Yes, once we receive the broken lamp, we'll ship the new one.", retry: true, r: ['So I wait a week or two with no lamp?'], fb: "Replacements ship right away — don't wait for the return." },
        { q: 1, t: "You can keep the broken one, we don't need it back.", go: 'close', r: ['Oh. Okay, thanks.'], fb: 'Only items under $25 are kept. The lamp is $89, so he gets a prepaid return label.' },
        { q: 2, t: "No, the replacement ships right away. We'll email you a label for the broken one.", go: 'close', fb: 'Right. Mention the free Express shipping and the 30 days to return it.' }
      ]
    },
    close: {
      c: ['Great, that was easy. Thanks.'],
      o: [
        { q: 3, t: "You're welcome, Omar. Is there anything else I can help you with today?", go: 'end', fb: 'Offers more help before ending the call.' },
        { q: 2, t: 'Happy to help. Enjoy the new lamp!', go: 'end_short', fb: "Warm, but ask if there's anything else first." },
        { q: 1, t: 'Bye.', go: 'end_cold', fb: 'Too abrupt.' }
      ]
    },
    end: { c: ["No, that's everything. Have a good one."], end: 'resolved' },
    end_short: { c: ['Thanks. Bye.'], end: 'resolved' },
    end_cold: { c: ['Okay. Bye.'], end: 'resolved' }
  }
});

/* ---------- Level 3 · Hard and Expert days ---------- */

SR.call({
  id: 'call-mark', level: 3, persona: 'neutral', patience: 80,
  channel: 'phone', verified: false, verifyNote: 'Caller is not the account holder · number not on file', priority: 'High',
  topic: 'Change my wife’s order', disp: ['account'],
  customer: {
    first: 'Mark', last: 'Ellison', photo: 'men/63', location: 'Seattle, Washington',
    email: 'No account', phone: '+1 (206) 555-0110 · not on file', since: null,
    plan: 'Guest', ltv: '$0.00', orders: 0, tags: ['Not the account holder']
  },
  sections: [
    {
      title: 'Order LM-485830 · account of Jennifer Ellison', icon: 'box', rows: [
        ['Status', { pill: 'Processing', tone: 'warning' }],
        ['Placed', { date: '2026-11-04', time: '10:16 PM' }],
        { items: [{ name: 'Nova 4K Projector', meta: 'Qty 1', price: '$499.00', stock: 'In stock · 9 units', tone: 'success' }] },
        ['Total', { strong: '$548.65' }],
        ['Ship to', '1180 Lakeview Ave, Seattle, WA 98102'],
        ['Account holder', 'Jennifer Ellison'],
        ['Email on file', 'jen.ellison@icloud.com'],
        ['Phone on file', '+1 (206) 555-0147'],
        ['Ships', 'Monday, Nov 9 (scheduled)']
      ]
    }
  ],
  timeline: [
    ['Nov 4 · 10:16 PM', 'Order placed by Jennifer Ellison (app)'],
    ['Nov 9 (scheduled)', 'Ships from Seattle warehouse', 'warning']
  ],
  policies: ['verification', 'orders', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi, I'm calling about my wife's order. Jennifer Ellison. She ordered a projector, and I need you to send it to my office instead of our house."],
      o: [
        { q: 3, t: "Thanks for calling Lumen & Co., this is {agent}. I'm happy to explain the options. To protect her account, I can only make changes to an order with the account holder herself. Is Jennifer with you right now?", go: 'holder', fb: 'Polite, explains why, and looks for the right way: talking to the account holder.' },
        { q: 0, t: "Sure! What's the office address? I'll update it now.", retry: true, r: ['Great. Do you need anything else from me? I have the order number, LM-485830.'], fb: 'Never change an order for someone who is not the account holder. Address changes are a common way packages get stolen.' },
        { q: 1, t: "I can't talk to you about someone else's account. Goodbye.", retry: true, r: ["Wait, don't hang up! I'm her husband, it's our order."], fb: 'Right rule, but too harsh. Explain why and offer a way forward.' },
        { q: 2, t: "I'd need to speak with Jennifer to change her order. Can she come to the phone?", go: 'holder', fb: 'Correct. Introduce yourself and say it protects her account.' }
      ]
    },
    holder: {
      c: ["She's at work and can't take calls. Look, I'm her husband. I have the order number, LM-485830, and our ZIP code is 9 8 1 0 2. That's two details, right?"],
      o: [
        { q: 3, t: "I understand it's frustrating, Mark. Those details verify the account holder, and you've told me you're not Jennifer, so I can't change her order or share its details. The good news: it's still Processing, so Jennifer can change the address herself in the Lumen app in a minute, or call us when she's free.", go: 'push', fb: 'Holds the line kindly, explains why two details are not enough here, and gives a real solution.' },
        { q: 0, t: "You're right, two details is enough. What's the new address?", retry: true, r: ['Four hundred Pine Street, suite twelve. Thanks for being reasonable.'], fb: 'Two details verify the account holder; they do not let someone else act for her. He told you he is not Jennifer.' },
        { q: 1, t: "That's not how it works. Have her call.", go: 'push', r: ["Wow, okay. You're not very helpful."], fb: 'Correct but cold. Acknowledge him and tell him she can change it in the app.' },
        { q: 2, t: "Sorry, I can't change it unless I'm speaking with Jennifer. She can update the address in the app while the order is still processing.", go: 'push', fb: 'Good. A word of empathy would make it easier to hear.' }
      ]
    },
    push: {
      c: ["Fine. But can you at least tell me when it's going to ship? So I know when to expect it."],
      o: [
        { q: 3, t: "I'm sorry, I can't share details of Jennifer's order with anyone but her — that protects her account. She can see the status anytime in the app or in her confirmation email.", go: 'close', fb: 'Protects her privacy without sounding suspicious, and points to where the information is.' },
        { q: 0, t: "Sure — it's scheduled to ship on Monday, November 9.", retry: true, r: ['Monday, got it. And it is going to the Lakeview address, right?'], fb: 'You just shared order details with someone who is not the account holder.' },
        { q: 1, t: 'No.', go: 'close', r: ['Unbelievable.'], fb: 'Right answer, wrong delivery. Explain why and where she can see it.' },
        { q: 2, t: "I can't share her order details, but she can see everything in the app.", go: 'close', fb: 'Correct. Saying it protects her account helps him accept it.' }
      ]
    },
    close: {
      c: ["Alright, I'll ask her to do it. Thanks, I guess."],
      o: [
        { q: 3, t: 'Thanks for understanding, Mark. Is there anything else I can help you with?', go: 'end', fb: 'Thanks him and offers more help.' },
        { q: 2, t: 'Thanks for your patience. Have a good day.', go: 'end_short', fb: "Polite, but ask if there's anything else first." },
        { q: 1, t: 'Bye.', go: 'end_cold', fb: 'Too abrupt.' }
      ]
    },
    end: { c: ["No, that's it. Bye."], end: 'resolved' },
    end_short: { c: ['Yeah. Bye.'], end: 'resolved' },
    end_cold: { c: ['Bye.'], end: 'resolved' }
  }
});

SR.call({
  id: 'call-derek', level: 3, persona: 'angry', patience: 72,
  channel: 'phone', verified: true, verifyNote: 'Verified by the phone menu: caller ID and order number', priority: 'High',
  topic: 'Where is my refund?', disp: ['billing'],
  customer: {
    first: 'Derek', last: 'Shaw', photo: 'men/71', location: 'Chicago, Illinois',
    email: 'derek.shaw@gmail.com', phone: '+1 (312) 555-0181', since: '2022-11-28',
    plan: 'Standard', ltv: '$1,204.55', orders: 9, tags: ['2nd contact']
  },
  sections: [
    {
      title: 'Return RT-30981 · order LM-484540', icon: 'rotate', rows: [
        ['Status', { pill: 'Refunded', tone: 'success' }],
        { items: [{ name: 'Pulse ANC Headphones', meta: 'Black · Qty 1 · change of mind', price: '$199.99', stock: 'Returned', tone: 'neutral' }] },
        ['Received at warehouse', { date: '2026-10-29' }],
        ['Refund issued', { date: '2026-10-30' }],
        ['Refund amount', { strong: '$199.99' }],
        ['Refunded to', 'Visa •••• 3307 (original payment)'],
        ['Refund reference', { mono: 'RF-77120-LM' }],
        ['Return fee', 'Waived · prepaid label from the Oct 21 call']
      ]
    }
  ],
  timeline: [
    ['Oct 21', 'Return requested by phone · prepaid label sent'],
    ['Oct 29', 'Return received at Columbus warehouse', 'info'],
    ['Oct 30', 'Refund issued — $199.99 to Visa •••• 3307', 'success']
  ],
  policies: ['refunds', 'conduct'],
  notes: ['Oct 21 — Returned the headphones (too tight). Label fee waived as a one-time courtesy by supervisor. (Agent: Luis P.)'],
  start: 'start',
  nodes: {
    start: {
      c: ['Yeah. I sent back headphones two weeks ago, and I still do not have my money. What the hell is going on over there?'],
      o: [
        { q: 3, t: "I'm sorry you're still waiting, Derek. This is {agent} at Lumen & Co., and I'll find out exactly where your refund is.", go: 'facts', fb: 'Stays calm, acknowledges the wait and takes ownership.' },
        { q: 0, t: 'Please calm down, sir. Refunds take time.', retry: true, r: ["Don't tell me to calm down! I want my money!"], fb: '"Calm down" makes upset callers angrier, and it gives no information.' },
        { q: 1, t: "What's your order number?", go: 'facts', r: ["It's on your screen, isn't it? I already went through the phone menu."], fb: 'Cold, and the phone menu already found his order. Acknowledge him first.' },
        { q: 2, t: "I'm sorry about the wait. Let me look into it.", go: 'facts', fb: 'Good. Using his name and yours makes it more personal.' }
      ]
    },
    facts: {
      c: ['You people are useless. Idiots, all of you. Just give me my money.'],
      o: [
        { q: 3, t: "I want to help you, Derek, and I will, but I need us to keep this respectful, please. Here's what I see: your headphones reached our warehouse on October 29, and we issued the $199.99 refund the next day to your Visa ending 3307.", go: 'bank', fb: 'One respectful warning, as the policy says, then straight back to the facts.' },
        { q: 0, t: "If you're going to insult me, I'm ending this call.", end: 'unresolved', sys: 'You ended the call', fb: 'Give ONE respectful warning first. Ending the call is for abuse that continues after the warning.' },
        { q: 1, t: "Sorry, we're doing our best here. It's not my fault.", go: 'bank', r: ['Whatever. So where is it?'], fb: 'Defensive. Set one respectful boundary and give him the facts.' },
        { q: 2, t: 'Your $199.99 refund was issued on October 30 to your Visa ending 3307.', go: 'bank', fb: 'Accurate, but when a caller insults you, the policy asks for one respectful warning.' }
      ]
    },
    bank: {
      c: ["The thirtieth? Then where is it? It's not on my card."],
      o: [
        { q: 3, t: "Banks take 5 to 7 business days to post a refund after we issue it, so it should appear by Tuesday, November 10 at the latest. Your refund reference is RF-77120-LM; if it isn't there by then, your bank can trace it with that number.", go: 'calm', fb: 'Exact: bank timing, the latest date and the reference number to trace it.' },
        { q: 0, t: "That's strange, it should be instant. I'll issue a second refund to be safe.", retry: true, r: ["A second one? Wait, won't that mess things up?"], fb: 'Never issue a duplicate refund. Banks take 5–7 business days to post it.' },
        { q: 1, t: "It's with your bank now. You'll have to call them.", go: 'calm', r: ["So you're passing me off. Great."], fb: 'Sends him away without the timing or the reference number.' },
        { q: 2, t: 'Your bank needs 5 to 7 business days to post it, so it should show up by November 10.', go: 'calm', fb: 'Good. Give him the refund reference so his bank can trace it.' }
      ]
    },
    calm: {
      c: ["Fine. November tenth. Sorry I yelled, it's been a long week."],
      o: [
        { q: 3, t: "No problem at all, Derek, I understand. You'll see the $199.99 by the tenth. Is there anything else I can help you with today?", go: 'end', fb: 'Accepts the apology graciously, confirms the date and offers more help.' },
        { q: 2, t: "That's okay. I hope the rest of your week is better.", go: 'end_short', fb: "Kind. Ask if there's anything else before ending the call." },
        { q: 1, t: 'Okay. Bye.', go: 'end_cold', fb: 'He apologized — a cold goodbye wastes the chance to end on a good note.' }
      ]
    },
    end: { c: ["No, that's all. Thanks for your help."], end: 'resolved' },
    end_short: { c: ['Thanks. Bye.'], end: 'resolved' },
    end_cold: { c: ['Yeah. Bye.'], end: 'resolved' }
  }
});

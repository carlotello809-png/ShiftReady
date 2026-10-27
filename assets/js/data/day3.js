/* DAY 3 — Billing & Delivery (Wed, Nov 4, 2026) */

SR.scenario({
  id: 'd3-aisha', day: 3, arrive: 0, replyIn: 8, persona: 'impatient',
  channel: 'app', verified: true, priority: 'High',
  topic: 'Delivered but not received', disp: ['order-status'],
  customer: {
    first: 'Aisha', last: 'Bello', photo: 'women/29', location: 'Atlanta, Georgia',
    email: 'aisha.bello@gmail.com', phone: '+1 (404) 555-0187', since: '2024-08-21',
    plan: 'Standard', ltv: '$388.90', orders: 4, tags: []
  },
  sections: [
    {
      title: 'Order LM-482655', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-30' }],
        { items: [{ name: 'Ember Smart Speaker', meta: 'Charcoal · Qty 1', price: '$129.00', stock: 'In stock · 57 units', tone: 'success' }] },
        ['Shipping', 'Standard · Free'],
        ['Tax', '$11.48'],
        ['Total', { strong: '$140.48' }],
        ['Payment', 'Mastercard •••• 6612']
      ]
    },
    {
      title: 'Delivery', icon: 'truck', rows: [
        ['Carrier', 'FedEx Home Delivery'],
        ['Tracking', { mono: '771244901188' }],
        ['Delivery scan', { date: '2026-11-03', time: '6:42 PM' }],
        ['Proof', '“Left at front door”'],
        ['Ship to', '880 Peachtree St NE, Apt 1405, Atlanta, GA 30308'],
        ['Building', 'Apartment tower · staffed front desk']
      ]
    }
  ],
  timeline: [
    ['Oct 30 · 4:11 PM', 'Order placed'],
    ['Oct 31 · 9:20 AM', 'Shipped with FedEx', 'info'],
    ['Nov 3 · 8:10 AM', 'Out for delivery', 'info'],
    ['Nov 3 · 6:42 PM', 'Delivered — left at front door', 'success'],
    ['Nov 4 · 9:00 AM', 'Customer reports package missing', 'warning']
  ],
  policies: ['lost', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi, my package says delivered but it's NOT here", "I've looked everywhere. This is ridiculous"],
      o: [
        { q: 3, t: "Hi Aisha, I'm sorry — that's really stressful. I see your Ember Smart Speaker was marked delivered by FedEx yesterday, Nov 3 at 6:42 PM, 'left at front door'. Since you're in an apartment building, could you check with the front desk or mailroom? Carriers sometimes leave packages there.", go: 'checked', fb: 'Empathy, accurate details from the panel, and a practical first step that fits her building.' },
        { q: 0, t: "Packages marked as delivered become the customer's responsibility once the carrier drops them off.", retry: true, r: ['Excuse me?? I never got it!'], fb: "Blaming the customer escalates things — and it isn't our policy." },
        { q: 2, t: 'Sorry about that! Have you checked with your neighbors?', go: 'checked', fb: "Reasonable step. Sharing the delivery details first shows her you've actually looked." },
        { q: 0, t: "Hi Aisha, I'm so sorry — that's really stressful, especially after you've already looked everywhere. Don't worry, I won't make you wait any longer: I'll send you a replacement Ember Smart Speaker right now with Express shipping, and you'll get the new tracking number by email within the hour.", retry: true, r: ["Wait, really? Ok… but I don't want to be charged twice if the first one shows up."], fb: 'Policy: wait 48 hours after the delivery scan before replacing — packages scanned early usually show up.' }
      ]
    },
    checked: {
      c: ["I already asked the front desk. They don't have it.", 'So what now? It was a birthday present for my brother'],
      o: [
        { q: 3, t: "Thank you for checking. Sometimes carriers scan a package as delivered a bit early and it shows up within a day. Our policy is to wait 48 hours from the delivery scan — that's until tomorrow, Nov 5 at 6:42 PM. If it hasn't turned up by then, message us and we'll open a FedEx investigation and send a replacement or refund right away. I've added a note to your order so you won't need to explain again.", go: 'push', fb: "Clear policy with an exact deadline, next steps, and a note so she won't repeat herself." },
        { q: 0, t: "There's nothing we can do on our side — you'll need to contact FedEx directly.", retry: true, r: ['Seriously? I bought it from YOU, not from FedEx.'], fb: 'Never pass ownership to the carrier. We handle the investigation.' },
        { q: 2, t: 'We need to wait 48 hours before we can do anything. Please contact us again if it doesn\'t arrive.', go: 'push', fb: 'Right policy — give the exact deadline and what will happen next.' },
        { q: 0, t: 'Our policy is to wait 7 business days before we can open an investigation.', retry: true, r: ['7 BUSINESS DAYS?? Are you kidding me?'], fb: 'Wrong: it\'s 48 hours after the delivery scan. (5+ business days with no movement is the rule for packages stuck in transit.)' }
      ]
    },
    push: {
      c: ["48 hours?? Can't you just send another one now? I'm not trying to scam you"],
      o: [
        { q: 3, t: "I completely understand, and I'm not doubting you at all. The wait exists because packages marked delivered early usually turn up — it protects you from being charged twice. As soon as the 48 hours pass tomorrow evening, a replacement can ship the same day.", go: 'accept', fb: 'Holds the policy line with empathy, explains the WHY, and reassures her.' },
        { q: 0, t: "I completely understand, and I'm not doubting you at all — you've been really patient with all of this. Just this once, I'll make an exception to the 48-hour rule and send another speaker out to you, so your brother still gets his present on time.", retry: true, r: ["…wait, can you actually do that? I don't want problems later."], fb: "Don't break policy just to end a difficult conversation. Explain the reason for the 48-hour wait." },
        { q: 1, t: 'Sorry, rules are rules.', go: 'cold', fb: 'Accurate but dismissive. Explain WHY the policy exists.' },
        { q: 1, t: 'Let me escalate this to my supervisor.', retry: true, r: ['How long will THAT take?'], fb: 'No escalation needed — the policy is clear and you can handle it.' }
      ]
    },
    accept: {
      c: ['Okay… that makes sense I guess.', "And if it doesn't come, you'll send a new one?"],
      o: [
        { q: 3, t: "Yes — if it hasn't arrived by tomorrow at 6:42 PM, just message us. We'll open the FedEx investigation and you can choose a replacement (it's in stock) or a full refund of $140.48. Is there anything else I can help with?", go: 'end', fb: 'Specific, confident and complete.' },
        { q: 2, t: "Yes, Aisha, absolutely — if the speaker still hasn't turned up, we'll open an investigation with FedEx and send you either a replacement or a refund, whichever you prefer, so you won't be left out of pocket in either case.", go: 'end', fb: 'Correct. The exact deadline and amount would make it even clearer.' },
        { q: 0, t: "Most likely, yes — in most cases like this we end up sending a replacement or a refund once the investigation is done. I can't promise anything at this point though, because it depends on what FedEx finds, so let's see how it goes tomorrow.", retry: true, r: ["That's not very reassuring…"], fb: 'The policy IS clear: after 48 hours she gets a replacement or refund. Say so confidently.' }
      ]
    },
    cold: {
      c: ['wow. okay. so what happens if it never shows up?'],
      o: [
        { q: 3, t: "If it hasn't arrived by tomorrow at 6:42 PM, message us and we'll open a FedEx investigation right away — and you can choose a replacement or a full refund of $140.48. I've added a note to your order so you won't need to explain again.", go: 'end_meh', fb: 'Good recovery with a clear plan.' },
        { q: 1, t: "If it never shows up, just contact us again and we'll take another look at it for you. Sometimes these things sort themselves out, so keep an eye on your doorstep and the front desk over the next few days, and let us know.", go: 'end_meh', fb: 'Leaves her without a clear plan.' }
      ]
    },
    end: { c: ['Okay. Thanks for explaining 🙏'], end: 'resolved' },
    end_meh: { c: ['fine. bye'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd3-robert', day: 3, arrive: 5, replyIn: 14, persona: 'neutral',
  channel: 'web', verified: true, verifyNote: 'Signed in on lumenco web', priority: 'Medium',
  topic: 'Charged twice', disp: ['billing'],
  customer: {
    first: 'Robert', last: 'Chen', photo: 'men/22', location: 'San Jose, California',
    email: 'robert.chen@outlook.com', phone: '+1 (408) 555-0181', since: '2020-06-03',
    plan: 'Lumen Plus', ltv: '$3,412.55', orders: 41, tags: ['Lumen Plus', 'VIP']
  },
  sections: [
    {
      title: 'Order LM-483540', icon: 'box', rows: [
        ['Status', { pill: 'Processing', tone: 'warning' }],
        ['Placed', { date: '2026-11-03', time: '7:12 PM' }],
        ['Ships', { date: '2026-11-05' }],
        { items: [{ name: 'Ergo Mesh Office Chair', meta: 'Black · Qty 1', price: '$289.00', stock: 'In stock · 9 units', tone: 'warning' }] },
        ['Shipping', 'Express · Free (Lumen Plus)'],
        ['Tax', '$27.09'],
        ['Total', { strong: '$316.09' }],
        ['Payment', 'American Express •••• 1007']
      ]
    },
    {
      title: 'Payment activity', icon: 'card', rows: [
        {
          ledger: [
            ['Nov 3 · 7:10 PM', 'Authorization attempt', '$316.09', 'Failed · voided', 'danger'],
            ['Nov 3 · 7:12 PM', 'Authorization', '$316.09', 'Approved · pending', 'success']
          ]
        },
        { note: 'First attempt failed: billing ZIP mismatch. The voided hold may show as pending for 3–5 business days. Card is charged once, when the order ships.', tone: 'info' }
      ]
    }
  ],
  timeline: [
    ['Nov 3 · 7:10 PM', 'Checkout attempt — payment declined (billing ZIP mismatch)', 'danger'],
    ['Nov 3 · 7:12 PM', 'Order placed — payment authorized', 'success'],
    ['Nov 5 (scheduled)', 'Ships — card charged at shipment', 'warning']
  ],
  policies: ['payments', 'conduct'],
  notes: [],
  history: [
    { from: 'bot', text: "Hi! I'm Lumi, the Lumen & Co. virtual assistant. How can I help you today?", ago: 75 },
    { from: 'customer', text: 'I was charged twice for my order', ago: 58 },
    { from: 'bot', text: "I'm sorry to hear that! Billing questions need a human agent — connecting you now.", ago: 52 },
    { from: 'system', text: 'Lumi transferred the conversation to you', ago: 1 }
  ],
  start: 'start',
  nodes: {
    start: {
      c: [],
      o: [
        { q: 3, t: "Hi Robert, I'm {agent} — thanks for your patience. I understand you're seeing two charges for your order; let me check the payment activity on LM-483540 right now.", go: 'detail', fb: 'Introduces yourself, restates the concern and takes ownership.' },
        { q: 1, t: "Hi Robert, thanks for your patience, and sorry about the confusion with your payment. To get to the bottom of it quickly, could you send me a screenshot of your bank statement showing both charges? That way I can see exactly what you're seeing.", retry: true, r: ["I'd rather not send my bank statement in a chat. Can't you see it on your end?"], fb: "The payment activity is in the panel. Don't ask for sensitive documents you don't need." },
        { q: 2, t: "Hello Robert, thanks for your patience while you were transferred over to me. Let me check the payment activity on your order right now and see what's going on with those two charges.", go: 'detail', fb: 'Fine. Introducing yourself after a bot transfer is a nice touch.' }
      ]
    },
    detail: {
      c: ['Sure. My Amex app shows $316.09 twice. I only placed one order.'],
      o: [
        { q: 3, t: "Thanks for waiting. Here's what happened: your first payment attempt at 7:10 PM failed because the billing ZIP didn't match, and then the order went through at 7:12 PM. The failed attempt is just a temporary 'pending' hold — it was voided and will never be charged. It'll disappear within 3–5 business days, and you'll only be charged once, when the chair ships.", go: 'worried', fb: "Clear and accurate, straight from the payment activity, with reassurance that he's charged once." },
        { q: 0, t: "I'm so sorry — you were charged twice by mistake. I'll refund one of the charges right away.", retry: true, r: ["Ok… but my app shows both as 'pending', not posted. So what exactly are you refunding?"], fb: "Incorrect: one attempt failed. It's a pending hold, not a charge — there's nothing to refund." },
        { q: 1, t: "That's completely normal, don't worry about it.", go: 'worried', r: ['Normal how? $316 twice is not normal for me.'], fb: "Don't dismiss the concern. Explain specifically what happened." }
      ]
    },
    worried: {
      c: ['Ok, but 3–5 days is a long time to have $316 blocked. Can you release it faster?'],
      o: [
        { q: 3, t: "I understand — that's a lot to have on hold. It's already been voided on our side; the remaining time is your bank's processing. If you'd like it faster, you can call American Express and mention the authorization was voided by the merchant — banks can often release it sooner.", go: 'close', fb: 'Honest about what you control, and gives him a practical way to speed it up.' },
        { q: 0, t: "I completely understand, Robert — nobody wants $316 blocked for days. Good news: I can take care of that from here. I'm releasing the hold right now on our side, so it should disappear from your Amex app within a few minutes and the full amount will be back on your card.", retry: true, r: ['Really? Minutes? Last time this happened it took days…'], fb: "Don't promise timelines you don't control. The bank releases the hold." },
        { q: 2, t: 'Unfortunately that depends on your bank.', go: 'close', fb: 'True. Suggesting he call Amex gives him something he can actually do.' }
      ]
    },
    close: {
      c: ['Got it. Thanks for actually explaining it clearly.'],
      o: [
        { q: 3, t: 'Of course! Your chair is scheduled to ship on Nov 5 with free Express shipping. Is there anything else I can help you with?', go: 'end', fb: 'Adds a useful update and closes properly.' },
        { q: 2, t: "You're very welcome — I'm glad that cleared things up and that you can stop worrying about the double charge. Is there anything else I can help you with?", go: 'end', fb: 'Good close.' },
        { q: 1, t: 'np', go: 'end_cold', fb: 'Too casual.' }
      ]
    },
    end: { c: ['All good, have a nice day!'], end: 'resolved' },
    end_cold: { c: ['ok. bye'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd3-emily', day: 3, arrive: 20, replyIn: 10, persona: 'impatient',
  channel: 'messenger', verified: true, verifyNote: 'Messenger linked to account', priority: 'Medium',
  topic: 'Where is my refund?', disp: ['billing'],
  customer: {
    first: 'Emily', last: 'Novak', photo: 'women/17', location: 'Chicago, Illinois',
    email: 'emily.novak@yahoo.com', phone: '+1 (312) 555-0145', since: '2022-02-14',
    plan: 'Standard', ltv: '$1,021.30', orders: 15, tags: []
  },
  sections: [
    {
      title: 'Order LM-479902', icon: 'box', rows: [
        ['Status', { pill: 'Returned', tone: 'neutral' }],
        ['Placed', { date: '2026-10-06' }],
        ['Delivered', { date: '2026-10-10' }],
        { items: [{ name: 'Ceramic Table Lamp', meta: 'White & Brass · Qty 1', price: '$69.00' }] },
        ['Shipping', 'Standard · Free'],
        ['Tax', '$7.07'],
        ['Total paid', { strong: '$76.07' }],
        ['Payment', 'Visa •••• 3355']
      ]
    },
    {
      title: 'Return & refund', icon: 'rotate', rows: [
        ['Return status', { pill: 'Refunded', tone: 'success' }],
        ['Reason', 'Changed my mind'],
        ['Requested', { date: '2026-10-24' }],
        ['Dropped at UPS', { date: '2026-10-25' }],
        ['Received at warehouse', { date: '2026-10-30' }],
        ['Refund processed', { date: '2026-11-02' }],
        ['Refund ID', { mono: 'RF-22817' }],
        ['Refund amount', { strong: '$69.12' }],
        ['Breakdown', '$76.07 − $6.95 return shipping'],
        ['Refunded to', 'Visa •••• 3355']
      ]
    }
  ],
  timeline: [
    ['Oct 10', 'Delivered', 'success'],
    ['Oct 24', 'Return requested — reason: changed my mind'],
    ['Oct 25', 'Dropped off at UPS', 'info'],
    ['Oct 30', 'Received at warehouse', 'info'],
    ['Nov 2', 'Refund processed — $69.12', 'success']
  ],
  policies: ['refunds', 'returns', 'goodwill'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi. I returned a lamp almost 2 weeks ago and still haven't gotten my refund.", 'Order LM-479902'],
      o: [
        { q: 3, t: 'Hi Emily, thanks for the order number — let me check the status of your return and refund right now.', go: 'status', fb: "Acknowledges and tells her exactly what you're checking." },
        { q: 0, t: "Hi Emily, thanks for reaching out, and I'm sorry you're still waiting. Refunds can take up to 30 days to come through after a return, so this is still within the normal timeframe — please give it a little more time and it should appear soon.", retry: true, r: ["30 days?? That's not what your website says."], fb: 'Wrong and dismissive. Check the refund status first.' },
        { q: 2, t: 'Hello! One moment, please.', go: 'status', fb: "OK. Telling her what you're checking makes the wait feel shorter." }
      ]
    },
    status: {
      c: [],
      o: [
        { q: 3, t: 'Thanks for waiting! Our warehouse received your lamp on Oct 30, and your refund of $69.12 was processed on Nov 2 to your Visa ending in 3355. Banks usually take 5–7 business days to post it, so you should see it by Nov 11 at the latest.', go: 'amount', fb: "Exact dates, amount, card and a clear 'by' date." },
        { q: 0, t: "Thanks for waiting, Emily. I've checked order LM-479902: your lamp is at our warehouse, but the refund hasn't been processed yet because the team is still inspecting it. Once the inspection is finished, the refund goes back to your Visa and you'll get an email when it's done.", retry: true, r: ['What? I got an email saying it was received on Oct 30…'], fb: 'Incorrect — the refund was processed on Nov 2. Read the return section carefully.' },
        { q: 2, t: "Thanks for waiting! Good news: the warehouse received your lamp and your refund was processed on Nov 2, so it's already on its way back to you. It can take a few business days for it to show up on your statement, depending on your bank.", go: 'amount', fb: 'Correct. Include the amount, card and a date she can expect it.' }
      ]
    },
    amount: {
      c: ['Wait, $69.12? I paid $76.07. Why is it less?'],
      o: [
        { q: 3, t: "Good question. The return reason was 'changed my mind', so the standard $6.95 return shipping fee was deducted — it's only free for damaged, defective or wrong items, or for Lumen Plus members. $76.07 − $6.95 = $69.12.", go: 'upset', fb: 'Explains what was deducted and why, with the math.' },
        { q: 1, t: "That's our policy.", go: 'upset', fb: "Explain what was deducted and why. 'That's our policy' alone sounds dismissive." },
        { q: 0, t: "You're right to ask, Emily — I'm sorry about that. Looking at your return, the $6.95 difference looks like a mistake on our side, so I'll refund the missing $6.95 to your Visa ending in 3355 right now. You'll see it together with the rest of your refund.", retry: true, r: ["Oh. Is it a mistake though? I don't want it charged back later."], fb: "It isn't a mistake: the return fee applies to change-of-mind returns for non-members." }
      ]
    },
    upset: {
      c: ["Hmm. Nobody told me there was a fee. That's annoying."],
      o: [
        { q: 3, t: "I'm sorry it wasn't clear — I understand that's frustrating. The fee is listed in the return policy and in your return confirmation, but I'll pass your feedback on so we make it more visible. Is there anything else I can help you with?", go: 'end', fb: 'Owns the experience, stays within policy and logs the feedback.' },
        { q: 1, t: "I'm really sorry it wasn't clear — I completely understand why that's annoying. As a one-time courtesy, I've added a $6.95 store credit to your account, so you're not out of pocket for the return fee. Is there anything else I can help you with?", go: 'end', fb: 'Goodwill credits are for service failures — not for waiving a correctly applied policy fee.' },
        { q: 0, t: "I understand it's annoying, Emily, but the fee is clearly listed in the return policy and on the confirmation page you saw before sending the lamp back. You should have read the return policy before sending it back, so the deduction stays.", go: 'rude', fb: 'Never blame the customer.' }
      ]
    },
    end: { c: ["No, that's it. Thanks for checking."], end: 'resolved' },
    rude: { c: ['Wow. Okay. Thanks for nothing.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd3-tom', day: 3, arrive: 35, replyIn: 23, persona: 'calm',
  channel: 'app', verified: true, priority: 'Low',
  topic: 'Price dropped after purchase', disp: ['refund'],
  customer: {
    first: 'Tom', last: 'Fischer', photo: 'men/41', location: 'Minneapolis, Minnesota',
    email: 'tom.fischer@gmail.com', phone: '+1 (612) 555-0108', since: '2023-01-27',
    plan: 'Standard', ltv: '$735.60', orders: 8, tags: []
  },
  sections: [
    {
      title: 'Order LM-481777', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-26' }],
        ['Delivered', { date: '2026-10-30' }],
        {
          items: [
            { name: 'Pulse ANC Headphones', meta: 'Black · Paid $129.00', price: '$129.00', stock: 'Current price $99.00 · Fall sale', tone: 'warning' },
            { name: 'Headphone Travel Case', meta: 'Black · Paid $19.00', price: '$19.00', stock: 'Current price $19.00', tone: 'neutral' }
          ]
        },
        ['Tax', '$11.88 (8.025%)'],
        ['Total', { strong: '$159.88' }],
        ['Payment', 'Visa •••• 6630']
      ]
    },
    {
      title: 'Price check', icon: 'tag', rows: [
        ['Headphones', '$129.00 → $99.00'],
        ['Difference', { strong: '$30.00 + $2.41 tax = $32.41' }],
        ['Promotion type', 'Fall sale (not a Lightning Deal)'],
        ['14-day window', { pill: 'Open until Nov 9', tone: 'success' }],
        ['Previous adjustments', 'None']
      ]
    }
  ],
  timeline: [
    ['Oct 26 · 8:05 PM', 'Order placed'],
    ['Oct 30', 'Delivered', 'success'],
    ['Nov 2', 'Pulse ANC Headphones price → $99.00 (Fall sale)', 'warning']
  ],
  policies: ['priceAdjust', 'refunds'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hey! Quick question 🙂', "I bought the Pulse headphones last week for $129 and now they're $99 on your site. Anything you can do?"],
      o: [
        { q: 3, t: "Hi Tom! Good timing — you bought the Pulse ANC Headphones on Oct 26 for $129.00 and they're now $99.00. That's within our 14-day price adjustment window, so you're eligible for the $30 difference.", go: 'how', fb: 'Confirms the facts and the policy in one clear message.' },
        { q: 0, t: "Hi Tom, thanks for the quick question! I totally get it — it's frustrating to see a lower price right after you buy. Unfortunately our prices change all the time, so we're not able to adjust past purchases, but you'll get the new price on anything you order from now on.", retry: true, r: ['Oh really? I thought you had some kind of price adjustment thing?'], fb: 'Wrong — purchases within 14 days get a one-time price adjustment.' },
        { q: 2, t: "Hey Tom, great question, and thanks for reaching out! We do have a price adjustment policy for situations like this, so let me check your order and see whether you're eligible for one — give me just a moment.", go: 'check', fb: 'Good. You could also confirm the details right away.' }
      ]
    },
    check: {
      c: [],
      o: [
        { q: 3, t: "Good news: you bought them on Oct 26 — 9 days ago — so you're within the 14-day window. You're eligible for the $30 difference.", go: 'how', fb: 'Accurate date math and a clear answer.' },
        { q: 0, t: "Sorry — you bought the headphones more than 14 days ago, so they aren't eligible for a price adjustment.", retry: true, r: ["Hmm, I'm pretty sure it was Oct 26… that's only 9 days ago?"], fb: 'Count carefully: Oct 26 → Nov 4 is 9 days.' }
      ]
    },
    how: {
      c: ['Oh nice! How do I get it? Do I have to return them?'],
      o: [
        { q: 3, t: "No return needed! I've just processed the adjustment: $30.00 plus the tax on it — $32.41 in total — back to your Visa ending in 6630. It'll show up within 5–7 business days.", go: 'match', fb: 'Takes action and gives the exact amount, card and timeframe.' },
        { q: 0, t: "Good question, Tom! The easiest way is to start a return for the headphones from your account, and once they're back with us you'll get the full $129 refunded. Then just buy them again at the new $99 price — you'll end up $30 better off.", retry: true, r: ["That seems like a lot of hassle… isn't there an easier way?"], fb: 'No return is needed — the difference is refunded straight to the original payment.' },
        { q: 2, t: "Good news — there's no need to return anything or buy the headphones again! You can keep them exactly as they are, and I'll refund the $30 difference straight back to the card you paid with.", go: 'match', fb: 'Correct. Mentioning the tax portion and the timeframe makes it complete.' }
      ]
    },
    match: {
      c: ['Awesome!! 🙌', 'One more thing — the travel case is $15 on another site and $19 here. Can you match that too?'],
      o: [
        { q: 3, t: "I wish I could! Price adjustments only cover drops on our own site — we don't match other retailers. But if our price on the case drops before Nov 9 (14 days from your purchase), just message us and we'll refund the difference.", go: 'close', fb: 'Clear "no" with a helpful alternative inside policy.' },
        { q: 0, t: "Good eye! Since you're already a customer, I'll match the other site's price for the Headphone Travel Case. That's $4 back, so I'll refund the difference to your Visa ending in 6630 — it'll show up within 5–7 business days.", retry: true, r: ["Wait, really? I didn't think you price matched other stores."], fb: "We don't match competitor prices." },
        { q: 2, t: "Sorry, we don't price match other stores.", go: 'close', fb: 'Correct. Adding what IS possible (adjustment if OUR price drops before Nov 9) keeps it positive.' }
      ]
    },
    close: {
      c: ['Fair enough, worth asking 😄 Thanks!'],
      o: [
        { q: 3, t: 'Always worth asking! Enjoy the headphones, Tom. Anything else I can help with today?', go: 'end', fb: 'Friendly, personal close.' },
        { q: 2, t: "You're welcome, Tom — enjoy the new headphones and the extra $30! Thanks for shopping with Lumen & Co., and have a great day!", go: 'end_short', fb: "Polite — ask if there's anything else." },
        { q: 1, t: 'ok', go: 'end_short', fb: 'Too flat for a happy customer.' }
      ]
    },
    end: { c: ["That's all. Have a good one!"], end: 'resolved' },
    end_short: { c: ['👍'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd3-natalie', day: 3, arrive: 55, replyIn: 20, persona: 'calm',
  channel: 'web', verified: 'na', verifyNote: 'Guest · pre-sales question (no verification needed)', priority: 'Low',
  topic: 'Question before buying', disp: ['product-info'],
  customer: {
    first: 'Natalie', last: 'Brooks', photo: 'women/57', location: 'Raleigh, North Carolina',
    email: 'natalie.brooks@gmail.com', phone: '—', since: null,
    plan: 'Guest', ltv: '—', orders: 0, tags: ['Pre-sales']
  },
  sections: [
    {
      title: 'Product viewed', icon: 'tag', rows: [
        { items: [{ name: 'Vortex Pro Blender 1400W', meta: 'Brushed Steel · ★ 4.7 (2,318 reviews)', price: '$149.00', stock: 'In stock · 31 units', tone: 'success' }] },
        ['Motor', '1400 W'],
        ['Jar', '64 oz BPA-free Tritan'],
        ['Programs', '6 presets (smoothie, ice crush, soup…)'],
        ['Frozen fruit / ice', 'Yes — designed for it'],
        ['Dishwasher safe', 'Jar, lid & tamper (top rack). Motor base: wipe clean only'],
        ['Warranty', '7-year limited (manufacturer)'],
        ['Category', 'Kitchen appliance — 30-day returns'],
        ['Shipping', 'Free standard · order by 2 PM, ships today']
      ]
    },
    {
      title: 'Compare: Vortex Compact', icon: 'layers', rows: [
        ['Price', '$89.00'],
        ['Motor', '900 W'],
        ['Jar', '32 oz'],
        ['Frozen fruit / ice', 'Yes — small batches'],
        ['Warranty', '2-year limited'],
        ['Stock', { pill: 'In stock · 64', tone: 'success' }]
      ]
    }
  ],
  timeline: [
    ['Nov 4 · 9:22 AM', 'Viewed Vortex Pro Blender (3 min)'],
    ['Nov 4 · 9:25 AM', 'Viewed Vortex Compact (1 min)'],
    ['Nov 4 · 9:26 AM', 'Opened chat from product page']
  ],
  policies: ['returns', 'shipping'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi! I'm looking at the Vortex Pro blender", 'Is it good for smoothies with frozen fruit? And can it go in the dishwasher? 🙏'],
      o: [
        { q: 3, t: 'Hi Natalie! The Vortex Pro is a great pick for that — its 1400W motor is designed for frozen fruit and ice, so smoothies are no problem. The 64 oz jar, lid and tamper are top-rack dishwasher safe; the motor base just needs a wipe.', go: 'compare', fb: 'Accurate, friendly and answers both questions precisely.' },
        { q: 1, t: 'Yes and yes.', go: 'compare', r: ['Haha ok, short and sweet 😅'], fb: 'Correct, but pre-sale chats are a chance to inform and build confidence.' },
        { q: 0, t: 'Hi Natalie! Great choice — the Vortex Pro handles frozen fruit and ice easily thanks to its 1400W motor, so your smoothies will come out silky. And yes, the whole blender is dishwasher safe, so cleanup is super easy: just pop it all in after use.', retry: true, r: ['The whole thing? Even the motor base? 😳'], fb: 'Inaccurate: only the jar, lid and tamper are dishwasher safe. Never guess product specs.' }
      ]
    },
    compare: {
      c: ["Nice. What's the difference with the Compact one? That one's $60 cheaper"],
      o: [
        { q: 3, t: "Good question! The Compact has a 900W motor and a 32 oz jar — great for single servings. The Pro is more powerful with a 64 oz jar, so it's better for bigger batches or lots of frozen fruit. The Pro also has a 7-year warranty vs. 2 years on the Compact.", go: 'decide', fb: 'Clear, honest comparison that helps her choose.' },
        { q: 0, t: 'The Compact is basically the same blender, just a bit cheaper.', retry: true, r: ['Really? The specs look pretty different…'], fb: 'Not accurate — compare the specs in the product panel.' },
        { q: 1, t: "Honestly, the Pro is just better, Natalie, and it's the one I'd pick every time. The extra $60 is completely worth it, so I'd skip the Compact and go straight for the Pro — trust me, everyone who buys it loves it and I've never heard anyone wish they'd bought the Compact instead!", go: 'decide', r: ['Haha ok, but why though?'], fb: 'Pushy. Explain the differences so she can pick what fits her needs.' },
        { q: 0, t: "Good question! The main differences are power and size: the Pro has a 1400W motor and a 32 oz jar, while the Compact has a 900W motor and a 64 oz jar. The Pro also comes with a longer warranty, so it's the better pick if you blend a lot of frozen fruit at home.", retry: true, r: ['Wait, the bigger one has the smaller jar? That seems backwards 🤔'], fb: 'You mixed up the specs: the Pro has the 64 oz jar, the Compact the 32 oz.' }
      ]
    },
    decide: {
      c: ['Ok I think the Pro.', "If I don't like it, can I return it?"],
      o: [
        { q: 3, t: 'Absolutely — kitchen appliances can be returned within 30 days of delivery, unused and in the original packaging. And if you order before 2 PM today, it ships today with free standard shipping.', go: 'close', fb: 'Correct return window plus a helpful nudge on shipping.' },
        { q: 0, t: "Absolutely! Since the blender counts as electronics, you can return it within 15 days of delivery, as long as it's unused and in the original packaging. And if you order before 2 PM today, it ships today with free standard shipping.", retry: true, r: ['Is a blender considered electronics? 🤔'], fb: 'Kitchen appliances have a 30-day window. The 15-day rule is for electronics like audio, wearables and smart home.' },
        { q: 2, t: "Yes, of course, Natalie! Kitchen appliances like the Vortex Pro can be returned within 30 days of delivery, so you'll have plenty of time to try it out with all your favourite smoothie recipes before you decide.", go: 'close', fb: 'Correct. Mentioning the packaging condition helps avoid surprises.' }
      ]
    },
    close: {
      c: ['Perfect, ordering now! Thanks so much 😊'],
      o: [
        { q: 3, t: "Enjoy your smoothies, Natalie! If you have any questions once it arrives, we're here to help.", go: 'end', fb: 'Warm close that invites her back.' },
        { q: 2, t: "You're welcome, Natalie! The Vortex Pro is a great choice, and it ships today if you order before 2 PM. Have a lovely day!", go: 'end', fb: 'Fine.' }
      ]
    },
    end: { c: ['Bye! 👋'], end: 'resolved' }
  }
});

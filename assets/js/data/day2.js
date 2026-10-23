/* DAY 2 — Returns & Accounts (Tue, Nov 3, 2026) */

SR.scenario({
  id: 'd2-sofia', day: 2, arrive: 0, replyIn: 22, persona: 'calm',
  channel: 'app', verified: true, priority: 'Low',
  topic: 'Exchange for another size', disp: ['return-exchange'],
  customer: {
    first: 'Sofia', last: 'Martinez', photo: 'women/44', location: 'Miami, Florida',
    email: 'sofia.mtz@gmail.com', phone: '+1 (305) 555-0119', since: '2023-11-02',
    plan: 'Standard', ltv: '$648.25', orders: 9, tags: ['Apparel shopper']
  },
  sections: [
    {
      title: 'Order LM-481540', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-22' }],
        ['Delivered', { date: '2026-10-27' }],
        {
          items: [{
            name: 'Everyday Wool Coat', meta: 'Camel · Size S · Qty 1', price: '$148.00',
            stocks: [['Size S · In stock (6)', 'success'], ['Size M · Out of stock — restock Nov 17', 'danger'], ['Size L · In stock (4)', 'success']]
          }]
        },
        ['Shipping', 'Standard · Free'],
        ['Tax', '$10.36'],
        ['Total', { strong: '$158.36' }],
        ['Payment', 'Visa •••• 5190'],
        ['Return window', { pill: 'Open until Nov 26', tone: 'success' }]
      ]
    }
  ],
  timeline: [
    ['Oct 22 · 1:05 PM', 'Order placed'],
    ['Oct 23 · 10:30 AM', 'Shipped with USPS', 'info'],
    ['Oct 27 · 3:18 PM', 'Delivered — front porch', 'success']
  ],
  policies: ['returns', 'conduct'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["Hi! I bought a wool coat and it's too small 😩", 'Can I exchange it for a size M?'],
      o: [
        { q: 3, t: "Hi Sofia! Sorry the coat didn't fit — let's fix that. I can see your Everyday Wool Coat in size S, delivered on Oct 27, so you're well within the 30-day return window. Let me check size M for you.", go: 'stock', fb: 'Empathy, then confirms the item, delivery date and eligibility before checking stock.' },
        { q: 0, t: "Of course! I'll send you a size M right away and email you a free return label for the S.", retry: true, r: ['Really?! Awesome. Wait… the app says M is sold out. Is it actually available?'], fb: 'You promised an exchange without checking stock — size M is out of stock until Nov 17.' },
        { q: 2, t: 'Hi Sofia, sure — let me check if we have size M.', go: 'stock', fb: "Good. Confirming the order and that she's within the window shows you've reviewed her account." },
        { q: 0, t: 'Unfortunately clothing can only be exchanged within 7 days of delivery.', retry: true, r: ["7 days? I'm pretty sure it's 30… I've exchanged things before."], fb: 'Incorrect. Apparel can be returned or exchanged within 30 days of delivery. (7 days is the window for reporting damage.)' }
      ]
    },
    stock: {
      c: [],
      o: [
        { q: 3, t: "I'm sorry, size M is out of stock right now — it's expected back on Nov 17. Your return window is open until Nov 26, so you have two options: 1) return the coat now for a full refund, or 2) I set up a back-in-stock alert for size M and you exchange it once it's back, still within your window. Which would you prefer?", go: 'choice', fb: 'Excellent: you noticed the restock date (Nov 17) falls inside her return window (Nov 26) and offered clear options.' },
        { q: 1, t: 'Size M is out of stock, sorry. You can return the coat for a refund.', go: 'other', r: ['Oh no 😕 Is there no other way? I really love the color.'], fb: 'Correct, but you missed an option: M restocks Nov 17, before her window closes on Nov 26.' },
        { q: 0, t: "Good news, size M is in stock! I'll set up the exchange now.", retry: true, r: ['Hmm, the app shows M as sold out. Are you sure?'], fb: 'Read the stock lines carefully — size M is out of stock until Nov 17.' },
        { q: 1, t: 'Size L is in stock — would you like that one instead?', retry: true, r: ['L would be way too big on me 😅 I need an M.'], fb: "Offering a size she didn't ask for isn't a solution. Check when M is back." }
      ]
    },
    other: {
      c: [],
      o: [
        { q: 3, t: "Actually, yes! Size M is expected back on Nov 17 and your return window is open until Nov 26. I can set up a back-in-stock alert so you can exchange it as soon as it's back. Would you like that?", go: 'choice', fb: 'Good recovery — you found the option that keeps her happy.' },
        { q: 0, t: "No, sorry, that's the only option.", go: 'end_refund', fb: 'A dead end. The restock date (Nov 17) was inside her return window.' }
      ]
    },
    choice: {
      c: ["Yes! I'll wait for the M 😊", 'Will the exchange cost me anything?'],
      o: [
        { q: 3, t: "Not at all! I've set up a back-in-stock alert for size M. When you get the alert, message us and we'll send a free prepaid label for the exchange. Just keep the coat unworn with the tags on until then.", go: 'close', fb: 'Accurate (exchanges get a free label), clear next steps, and a reminder about the condition rules.' },
        { q: 0, t: "Yes, there's a $6.95 return shipping fee that's deducted for exchanges.", retry: true, r: ["For an exchange too? That's not what the website says…"], fb: 'The $6.95 fee is for change-of-mind returns for refund — size exchanges get a free label.' },
        { q: 2, t: "No, exchanges are free. I've set up the alert for you.", go: 'close', fb: 'Correct. Telling her the next step and to keep the tags on would make it complete.' }
      ]
    },
    close: {
      c: ['Perfect, thank you so much {agent}! 💛'],
      o: [
        { q: 3, t: "You're so welcome, Sofia! Enjoy the coat once your size is back. Is there anything else I can help you with?", go: 'end', fb: 'Warm and complete.' },
        { q: 2, t: 'Happy to help! Have a great day.', go: 'end_short', fb: "Friendly — remember to ask if there's anything else." },
        { q: 1, t: 'np', go: 'end_short', fb: 'Too casual for a brand chat.' }
      ]
    },
    end: { c: ["No, that's everything. Bye! 👋"], end: 'resolved' },
    end_short: { c: ['Bye! 😊'], end: 'resolved' },
    end_refund: { c: ["Okay… I'll return it then, I guess. Thanks."], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd2-kevin', day: 2, arrive: 15, replyIn: 8, persona: 'impatient',
  channel: 'web', verified: true, verifyNote: 'Signed in on lumenco web', priority: 'Low',
  topic: 'Promo code not working', disp: ['promo'],
  customer: {
    first: 'Kevin', last: 'Walsh', photo: 'men/52', location: 'Denver, Colorado',
    email: 'kevin.walsh@outlook.com', phone: '+1 (720) 555-0193', since: '2025-05-14',
    plan: 'Standard', ltv: '$214.10', orders: 3, tags: []
  },
  sections: [
    {
      title: 'Shopping cart (not placed)', icon: 'cart', rows: [
        {
          items: [
            { name: 'Bamboo Bath Towel Set (6 pc)', meta: 'White · Home & Bath · Qty 1', price: '$54.00', stock: 'In stock', tone: 'success' },
            { name: 'Waffle Bath Mat', meta: 'White · Home & Bath · Qty 1', price: '$8.00', stock: 'In stock', tone: 'success' }
          ]
        },
        ['Subtotal', { strong: '$62.00' }],
        ['Code tried', 'FALL20 (3 attempts)'],
        ['Result', { pill: 'Not eligible', tone: 'danger' }],
        ['Message shown', '“This code isn’t eligible for the items in your cart.”']
      ]
    },
    {
      title: 'Frequently bought together', icon: 'layers', rows: [
        {
          items: [
            { name: 'Bamboo Hand Towels (Pair)', meta: 'White · Home & Bath', price: '$16.00', stock: 'In stock · 88 units', tone: 'success' },
            { name: 'Bamboo Washcloths (Set of 4)', meta: 'White · Home & Bath', price: '$12.00', stock: 'In stock · 140 units', tone: 'success' }
          ]
        }
      ]
    }
  ],
  timeline: [
    ['Nov 3 · 9:01 AM', 'Added Bamboo Bath Towel Set to cart'],
    ['Nov 3 · 9:02 AM', 'Added Waffle Bath Mat to cart'],
    ['Nov 3 · 9:03 AM', 'Code FALL20 rejected ×3', 'danger']
  ],
  policies: ['promotions', 'shipping'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ["your promo code doesn't work", "FALL20. it keeps saying 'not eligible'. tried 3 times"],
      o: [
        { q: 3, t: 'Hi Kevin, sorry for the hassle! Let me look at your cart and the FALL20 code right now.', go: 'why', fb: "Acknowledges the frustration and acts quickly — he's impatient." },
        { q: 1, t: 'Did you type it correctly? Codes are case-sensitive, so make sure it is all capitals.', retry: true, r: ["yes I typed it correctly. I'm not an idiot."], fb: 'Implies user error before checking anything. Look at the promotion terms first.' },
        { q: 2, t: 'Hello! Let me check that code for you.', go: 'why', fb: 'Fine. A touch of empathy helps with an impatient customer.' }
      ]
    },
    why: {
      c: [],
      o: [
        { q: 3, t: "Found it: FALL20 gives 20% off Home & Bath, but it needs a minimum of $75 and your cart is $62.00. Good news — you're only $13 away. For example, adding the Bamboo Hand Towels ($16) brings you to $78, and with 20% off you'd pay $62.40 — basically getting the hand towels for 40 cents.", go: 'happy', fb: 'Explains the exact reason and finds an honest, smart solution from the panel.' },
        { q: 2, t: 'The code needs a $75 minimum in Home & Bath items, and your cart is $62.00.', go: 'meh', fb: "Accurate, but offer a way forward — he's only $13 away." },
        { q: 0, t: "Unfortunately FALL20 expired on Oct 31, so it can't be used anymore.", retry: true, r: ['the banner on your homepage literally says it\'s valid until Nov 8'], fb: 'Wrong: FALL20 is valid until Nov 8. FREESHIP is the one that ended Oct 31 — check the promotions table.' },
        { q: 0, t: "No worries — I'll apply the 20% discount manually on my end.", retry: true, r: ['oh, you can do that? will it actually show at checkout though?'], fb: "Agents can't apply or override promo codes manually." }
      ]
    },
    meh: {
      c: ["ugh. so I just don't get a discount?"],
      o: [
        { q: 3, t: "You can! You're only $13 away from the $75 minimum. Adding the Bamboo Hand Towels ($16) gets you to $78 — after 20% off you'd pay $62.40, almost the same as now, with an extra item.", go: 'happy', fb: 'Turns a "no" into a real solution.' },
        { q: 0, t: 'Correct, not with this cart. Sorry!', go: 'lost', fb: 'A dead end. Look for an honest way to help the customer get what they want.' },
        { q: 1, t: 'You could add the Bamboo Washcloths ($12) to qualify.', retry: true, r: ['I added them. total is $74 and it STILL says not eligible 🙄'], fb: 'Check the math: $62 + $12 = $74 — still under the $75 minimum.' }
      ]
    },
    happy: {
      c: ["oh nice, that's actually a good deal", 'ok added them. FALL20 worked 👍'],
      o: [
        { q: 3, t: "Awesome! Your total should now show $62.40 before tax, and since it's over $50, standard shipping is free too. Anything else I can help with?", go: 'end', fb: 'Confirms the result and adds a useful detail (free shipping over $50).' },
        { q: 2, t: 'Great! Anything else I can help with?', go: 'end', fb: 'Good close.' },
        { q: 1, t: 'ok good', go: 'end_cold', fb: 'Too flat — finish strong.' }
      ]
    },
    lost: { c: ['whatever. forget it.'], end: 'unresolved' },
    end: { c: ["nope that's it. thanks"], end: 'resolved' },
    end_cold: { c: ['k'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd2-grace', day: 2, arrive: 45, replyIn: 16, persona: 'calm',
  channel: 'messenger', verified: true, verifyNote: 'Messenger linked to account', priority: 'Medium',
  topic: 'Item arrived damaged', disp: ['replacement'],
  customer: {
    first: 'Grace', last: 'Kim', photo: 'women/68', location: 'Seattle, Washington',
    email: 'grace.kim@gmail.com', phone: '+1 (206) 555-0164', since: '2021-09-30',
    plan: 'Lumen Plus', ltv: '$2,104.70', orders: 27, tags: ['Lumen Plus', 'VIP']
  },
  sections: [
    {
      title: 'Order LM-482201', icon: 'box', rows: [
        ['Status', { pill: 'Delivered', tone: 'success' }],
        ['Placed', { date: '2026-10-29' }],
        ['Delivered', { date: '2026-11-02' }],
        {
          items: [
            { name: 'Stoneware Dinner Plates (Set of 4)', meta: 'Earth Tones · Qty 1', price: '$64.00', stock: 'In stock · 22 units', tone: 'success' },
            { name: 'Stoneware Mugs (Set of 2)', meta: 'Speckled White · Qty 1', price: '$22.00', stock: 'In stock · 40 units', tone: 'success' }
          ]
        },
        ['Shipping', 'Express · Free (Lumen Plus)'],
        ['Tax', '$8.82'],
        ['Total', { strong: '$94.82' }],
        ['Payment', 'Visa •••• 2044'],
        ['Ship to', '1520 E Pine St, Seattle, WA 98122']
      ]
    },
    {
      title: 'Damage report', icon: 'alert', rows: [
        ['Reported', { date: '2026-11-03', time: '8:52 AM' }],
        ['Item', 'Stoneware Dinner Plates — 2 of 4 broken'],
        ['Evidence', 'Photo received (IMG_2041.jpg)'],
        ['Within 7 days?', { pill: 'Yes — 1 day after delivery', tone: 'success' }]
      ]
    }
  ],
  timeline: [
    ['Oct 29 · 6:22 PM', 'Order placed'],
    ['Oct 30 · 11:10 AM', 'Shipped with UPS — Express', 'info'],
    ['Nov 2 · 1:47 PM', 'Delivered', 'success'],
    ['Nov 3 · 8:52 AM', 'Damage reported in chat', 'warning']
  ],
  policies: ['damaged', 'shipping', 'conduct'],
  notes: [],
  history: [
    { from: 'customer', text: 'Hi, my order arrived yesterday and two of the dinner plates are broken. The box was crushed on one side.', ago: 260 },
    { from: 'agent', name: 'Jordan Lee', text: "Hi Grace, I'm so sorry to hear that! Could you please send me a photo of the damaged plates and the box?", ago: 220 },
    { from: 'customer', text: 'Here you go.', attach: { name: 'IMG_2041.jpg', size: '1.8 MB', desc: '2 broken plates · crushed box corner' }, ago: 140 },
    { from: 'system', text: "Jordan Lee's shift ended · conversation transferred to you", ago: 30 }
  ],
  start: 'start',
  nodes: {
    start: {
      c: ['Hello? Is someone still there?'],
      o: [
        { q: 3, t: "Hi Grace, I'm {agent} and I'll be taking over from Jordan. Thank you for the photo — I'm really sorry your plates arrived broken. I can see the damage clearly, so let's get this sorted right away.", go: 'options', fb: "Smooth handover: introduce yourself, show you've read the history, and don't make her repeat herself." },
        { q: 0, t: 'Hi! Welcome to Lumen & Co. How can I help you today?', retry: true, r: ['…I already explained everything to the other agent and sent a photo 😔'], fb: 'Read the history after a transfer — never make the customer repeat themselves.' },
        { q: 2, t: "Hi Grace, I'm taking over this chat. Sorry about the plates!", go: 'options', fb: "Good. Mentioning the photo shows you've actually reviewed the history." },
        { q: 1, t: "Hi Grace, could you send the photo again? I can't see what the previous agent saw.", retry: true, r: ['It\'s right there in the chat… I sent it a few minutes ago.'], fb: 'The photo is in the history above. Scroll up and read before replying.' }
      ]
    },
    options: {
      c: ["Thank you. They were a housewarming gift for my sister, so I'm a bit disappointed."],
      o: [
        { q: 3, t: "That's completely understandable. Since you reported it within 7 days, you can choose: a replacement set of plates (they're in stock) or a full refund of $64.00. A replacement ships right away — you don't have to wait to send the broken ones back. Either way, I'll email you a prepaid return label for the damaged set. Which would you prefer?", go: 'replace', fb: "Policy-perfect: offers the choice, confirms stock, and explains the label and that the replacement won't wait." },
        { q: 1, t: "I've issued a refund of $64.00 to your card.", retry: true, r: ["Oh… I'd actually prefer new plates since it's a gift. Is that possible?"], fb: 'The customer chooses between replacement and refund. Offer both before acting.' },
        { q: 0, t: "Please send the broken plates back first. Once our warehouse receives them, we'll ship the replacement.", retry: true, r: ['That could take weeks… the housewarming is this Saturday.'], fb: "Replacements for damaged items ship immediately — don't make her wait for the return." },
        { q: 2, t: 'So sorry! I can send a replacement or a refund — which would you prefer?', go: 'replace', fb: 'Correct options, a little rushed. Mention stock and the return label so she knows what to expect.' }
      ]
    },
    replace: {
      c: ['The replacement, please! Will it arrive before Saturday?'],
      o: [
        { q: 3, t: "Yes! Replacement orders created before 2 PM ship the same day with free Express shipping, so it should arrive by Thursday, Nov 5 or Friday, Nov 6 — before Saturday. I've created replacement order LM-483902, and you'll get the tracking by email shortly.", go: 'close', fb: 'Accurate timeline from the policy, plus clear confirmation of what you did.' },
        { q: 0, t: 'Yes, it will arrive tomorrow — guaranteed!', retry: true, r: ["Tomorrow? Is that really guaranteed? I don't want to count on it if it isn't…"], fb: 'Never guarantee delivery. Express is 2–3 business days: give the honest window (Nov 5–6).' },
        { q: 2, t: 'It ships today with Express, so it should arrive in 2–3 business days.', go: 'close', fb: 'Accurate. Converting it into dates (Nov 5–6) helps her plan for Saturday.' },
        { q: 0, t: 'It ships with standard shipping, so expect it in 5–7 business days.', retry: true, r: ["That would be after Saturday… 😟 Isn't there anything faster?"], fb: 'Replacements ship with free Express (2–3 business days), not Standard.' }
      ]
    },
    close: {
      c: ["Oh, that's wonderful. Thank you so much!", 'Do I need to pack the broken plates carefully?'],
      o: [
        { q: 3, t: 'Just wrap them in some paper so nobody gets hurt and use any box — the prepaid label covers it. You can drop it at any UPS location within 30 days. Is there anything else I can help with, Grace?', go: 'end', fb: 'Practical, safe guidance plus the 30-day window, and a proper close.' },
        { q: 1, t: 'No idea, just send them back however.', go: 'end_short', fb: "Unprofessional. If you're unsure, give practical, safe guidance." },
        { q: 2, t: 'Yes, please wrap them carefully and use the label we emailed. Anything else?', go: 'end', fb: 'Good — mentioning the 30-day window would complete it.' }
      ]
    },
    end: { c: ["No, that's everything. You've been lovely, thank you!"], end: 'resolved' },
    end_short: { c: ['Okay… thank you.'], end: 'resolved' }
  }
});

SR.scenario({
  id: 'd2-harold', day: 2, arrive: 80, replyIn: 27, persona: 'calm', typing: 1.6,
  channel: 'web', verified: false, verifyNote: 'Guest chat — cannot sign in', priority: 'Medium',
  topic: 'Account locked', disp: ['account'],
  nudges: ['Hello? Are you still there?', 'I am still waiting, thank you.', 'Perhaps I should call instead…'],
  customer: {
    first: 'Harold', last: 'Jenkins', photo: 'men/85', location: 'Tucson, Arizona',
    email: 'h.jenkins1952@aol.com', phone: '+1 (520) 555-0133', since: '2019-02-11',
    plan: 'Standard', ltv: '$963.00', orders: 18, tags: ['Customer since 2019']
  },
  sections: [
    {
      title: 'Account', icon: 'lock', rows: [
        ['Status', { pill: 'Locked', tone: 'danger' }],
        ['Reason', '5 failed sign-in attempts'],
        ['Locked at', { date: '2026-11-03', time: '8:47 AM' }],
        ['Last sign-in', { date: '2026-10-14' }],
        ['Email on file', 'h.jenkins1952@aol.com'],
        ['Phone on file', '+1 (520) 555-0133'],
        ['Billing ZIP', '85716'],
        ['Two-step verification', { pill: 'Off', tone: 'neutral' }],
        { note: "Locked accounts can't use “Forgot password”. Verify, unlock, then send a reset link.", tone: 'info' }
      ]
    }
  ],
  timeline: [
    ['Oct 14', 'Last successful sign-in'],
    ['Nov 3 · 8:41–8:47 AM', '5 failed sign-in attempts', 'warning'],
    ['Nov 3 · 8:47 AM', 'Account locked automatically', 'danger'],
    ['Nov 3 · 8:52 AM', '“Forgot password” blocked — account locked', 'warning']
  ],
  policies: ['verification', 'accounts'],
  notes: [],
  start: 'start',
  nodes: {
    start: {
      c: ['Hello. I am trying to get into my account but it says it is locked.', 'I may have typed the password wrong a few times.'],
      o: [
        { q: 3, t: "Hello Harold, thank you for contacting us — I'll help you get back in. First, for your security, could you please confirm the email address on the account and your billing ZIP code?", go: 'verified', r: ['Of course. The email is h.jenkins1952@aol.com and my zip code is 85716.'], fb: 'Patient and clear — and you verify identity before touching the account.' },
        { q: 0, t: "Sure! Tell me the password you've been using and I'll check what's wrong with it.", retry: true, r: ['Is that safe? My grandson told me never to share my password…'], fb: 'Never ask for a password. It is a serious security violation.' },
        { q: 2, t: 'Hi Harold! Could you please confirm your email address?', go: 'more', r: ['It is h.jenkins1952@aol.com'], fb: 'Good start, but guests need TWO details. Asking for both at once saves time.' },
        { q: 1, t: "Just click 'Forgot password' on the sign-in page and you'll be able to reset it.", retry: true, r: ['I tried that, but it says my account is locked and to contact support.'], fb: "Locked accounts can't use self-service reset — that's exactly why he's contacting you. Check the account panel." }
      ]
    },
    more: {
      c: [],
      o: [
        { q: 3, t: 'Thank you! And could you also confirm your billing ZIP code or the phone number on the account?', go: 'verified', r: ['Yes, my zip code is 85716.'], fb: 'Second verification detail collected — correct procedure.' },
        { q: 0, t: "Thanks, that's enough. Let me unlock your account.", retry: true, r: ['Oh, all right… is the email enough for security?'], fb: "One detail isn't enough for a guest. Policy requires two." }
      ]
    },
    verified: {
      c: [],
      o: [
        { q: 3, t: "Thank you, Harold, you're verified. Your account was locked this morning after 5 unsuccessful sign-in attempts — it's an automatic safety feature. I've unlocked it and sent a password-reset link to h.jenkins1952@aol.com. The link is valid for 30 minutes.", go: 'link', fb: 'Explains why in plain words, takes action, and says where the link went and how long it lasts.' },
        { q: 0, t: "Thank you! I've reset your password to Lumen2026 so you can sign in right away.", retry: true, r: ['Oh, you can choose it for me? Hmm… is that how it usually works?'], fb: 'Agents never set or share passwords. Unlock the account and send a reset link to the email on file.' },
        { q: 2, t: "Thanks. I've unlocked your account and sent a reset link to your email.", go: 'link', fb: 'Correct. Explaining why it locked and how long the link lasts helps a less technical customer.' }
      ]
    },
    link: {
      c: ["Oh, I see the email. It says 'Reset your password'.", 'What do I do now?'],
      o: [
        { q: 3, t: "Perfect! Click the blue 'Reset password' button in that email. A page will open where you type a new password twice. Choose something you'll remember but that's hard to guess — at least 8 characters with a number. Take your time, I'll wait right here.", go: 'done', fb: "Step-by-step guidance at the customer's pace — ideal for someone who isn't confident with technology." },
        { q: 1, t: 'Just follow the instructions in the email.', go: 'done', r: ['…all right, I will try.'], fb: "Too vague for a customer who's unsure. Walk him through it." },
        { q: 0, t: "Reply to that email with the new password you'd like and we'll set it for you.", retry: true, r: ['Send my password by email? Are you sure that is safe?'], fb: 'Never instruct customers to send passwords by email or chat.' }
      ]
    },
    done: {
      c: ['It worked! I am in.', 'Thank you for your patience with me.'],
      o: [
        { q: 3, t: "You're very welcome, Harold — you did great! One tip: you can turn on two-step verification in Account Settings for extra security. Is there anything else I can help you with today?", go: 'end', fb: 'Warm, adds a relevant security tip, and offers more help.' },
        { q: 2, t: 'Glad it worked! Anything else I can help with?', go: 'end', fb: 'Good close.' },
        { q: 1, t: 'Ok, bye.', go: 'end_cold', fb: 'He thanked you for your patience — reply with warmth.' }
      ]
    },
    end: { c: ['No, that is all. Have a nice day.'], end: 'resolved' },
    end_cold: { c: ['Oh. Goodbye then.'], end: 'resolved' }
  }
});

/* A tiny made-up world in the same format as assets/js/data/, with round numbers,
   so every expected result in the tests can be worked out by hand.
   Day decay is 0 by default: patience only changes with the replies. */
'use strict';

function scenario(over) {
  return Object.assign({
    id: 'd1-ana', day: 1, arrive: 0, persona: 'p', channel: 'web', priority: 'Low', topic: 'Test', disp: ['ok'],
    customer: { first: 'Ana', last: 'Test' },
    start: 's',
    nodes: {
      s: {
        c: ['hello'],
        o: [
          { q: 3, t: 'S3 for {first} from {agent}', go: 'm', fb: 'great' },   // 0
          { q: 2, t: 'S2', go: 'm', fb: 'good' },                             // 1
          { q: 1, t: 'S1', go: 'm', r: ['hmm'], fb: 'weak' },                 // 2
          { q: 0, t: 'S0', retry: true, r: ['really?'], fb: 'poor' }          // 3
        ]
      },
      m: {
        c: ['next question'],
        o: [
          { q: 3, t: 'M3', go: 'e', fb: 'm3' },                                        // 0
          { q: 2, t: 'M2', go: 'bad', fb: 'm2' },                                      // 1
          { q: 0, t: 'M0', go: 'bad', fb: 'm0' },                                      // 2
          { q: 0, t: 'M0 end', end: 'resolved', r: ['ok thanks'], disp: ['other'], fb: 'm0e' } // 3
        ]
      },
      e: { c: ['thanks'], end: 'resolved' },
      bad: { c: ['bye'], end: 'unresolved' }
    }
  }, over);
}

function world(over) {
  over = over || {};
  return {
    company: { name: 'Test Co.', bot: 'Bot' },
    days: over.days || [{ n: 1, title: 'Test day', date: '2026-11-02', decay: over.decay == null ? 0 : over.decay }],
    personas: {
      p: { label: 'Test', decay: 1, typing: 1, replyIn: 10, nudges: ['nudge 1', 'nudge 2', 'nudge 3'], leave: 'bye now' }
    },
    dispositions: [
      { id: 'ok', label: 'OK' },
      { id: 'other', label: 'Other' },
      { id: 'no-resolution', label: 'No resolution' }
    ],
    policies: { conduct: { title: 'Conduct' } },
    products: {},
    scenarios: over.scenarios || [scenario()]
  };
}

module.exports = { world, scenario };

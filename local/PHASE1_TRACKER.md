# 🦇 Batcave Phase 1 – Private Tracker

## Week 1 – Core Loop

- [X] Dev Runner exists
- [ ] Event envelope has correlationId
- [X] Logger service prints all events
- [ ] Mode → Device intents mapping
- [ ] Fake lights adapter
- [ ] Fake plug adapter

## Week 2 – Intelligence

- [ ] Fake anomaly engine
- [ ] Auto switch to DEFENSE rule
- [ ] Demo script sequence

## Week 3 – Real World

- [ ] Govee adapter
- [ ] Smart plug adapter
- [ ] Alexa integration
- [ ] Gesture integration

---

## Daily Log

### Day X
What I did:
What broke:
What to do tomorrow:


---

# Day 1 Notes

## What we built
- apps/dev-runner as the composition root
- in-memory GothamBus broadcaster
- Alfred Mode Engine subscribes via start()
- Verified MODE.SET_REQUESTED -> MODE.CHANGED flow

## What clicked
- Services “subscribe” by registering handler functions with the bus.
- Dev-runner is the always-on process that wires everything together.

## Current Day: Day 1 complete ✅

## Next Day: Day 2 (event envelope + correlationId + deterministic mode changes)

Last working command:
- pnpm dev  (prints MODE.SET_REQUESTED + MODE.CHANGED)

### Key files touched:

- apps/dev-runner/src/main.ts
- services/gotham-bus/src/bus.ts
- services/gotham-bus/src/events.ts
- services/alfred-mode-engine/src/alfred.ts
- services/alfred-mode-engine/package.json (added dependency)

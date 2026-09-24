# PATCHWORK RELAY — Prototype V0.1.1

## Core hypothesis
A player returns because another human has changed a persistent Patch that the player previously touched.

## Board encoding
`__` empty.
`I0` N-S straight; `I1` E-W straight.
`C0` N-E; `C1` E-S; `C2` S-W; `C3` W-N.
`T0` N-E-W; `T1` N-E-S; `T2` E-S-W; `T3` S-W-N.
`H0` N-E-S-W.

## Metrics
- `matchedEdges`: reciprocal adjacent connector pairs, counted once.
- `looseEnds`: connectors without a reciprocal adjacent connector; outside-board connectors count.
- `boundaryOpen`: loose connectors pointing outside the board.
- `components`: connected components formed by matched edges.
- `cycles`: `max(0, matchedEdges - occupiedCount + components)`.
- `coreConnected`: all four central cells `(1,1),(1,2),(2,1),(2,2)` are occupied and in the same matched-edge component.

## Non-negotiable relay rule
The previous mover cannot immediately move again. A different player must commit the next move.

## Persistent state machine
`NEW → ACTIVE → ACTIVE ... → ARCHIVED`

Each valid commit:
- replaces the board,
- increments `stateVersion`,
- increments `moveCount`,
- records the move/history,
- changes `lastMoverPlayerId`,
- computes the next challenge from the resulting state.

Archive at `moveCount == 12`, or earlier if no interesting next challenge has a valid move.

## Session state machine
`READY → PREVIEW → COMMITTING → COMMITTED → READY`

Failure branches:
- invalid move → `REJECTED → READY`
- stale version → `STALE → READY`

## Client move packet
- `patchId`
- `stateVersion`
- `turnTicket`
- `row`
- `col`
- `rotationStepsCW` = 1, 2 or 3
- `idempotencyKey`

The client never sends the authoritative next board.

## Server validation
1. Patch active.
2. Ticket valid, unexpired, unused, and bound to exact patch/player/version.
3. Player differs from previous mover.
4. Target occupied and movable.
5. Rotation valid.
6. Server derives candidate from authoritative board.
7. Exactly one tile changed.
8. Occupancy unchanged.
9. Tile type unchanged.
10. Candidate is not identical.
11. Metrics recomputed.
12. Challenge predicate passes.
13. Idempotency key is new.
14. Atomic commit.

## Challenges
`GAIN_LINK`, `CLEAN_TWO`, `MERGE`, `GAIN_LOOP`, `CORE_JOIN`, `EXACT_TWO`, with `REWIRE` as a controlled fallback.

### GAIN_LINK
Add at least one matched edge; loose ends may rise by at most one.

### CLEAN_TWO
Remove at least two loose ends; do not reduce matched edges.

### MERGE
Reduce components by at least one; do not reduce matched edges.

### GAIN_LOOP
Increase cycle rank by at least one; do not increase components.

### CORE_JOIN
Connect the four central cells when they were previously not connected; do not reduce matched edges.

### EXACT_TWO
Increase matched edges by exactly two; loose ends may rise by at most one.

### REWIRE
Highlight a deterministic 3×3 focus area. One move inside it is valid when:
- matched edges do not fall by more than one,
- loose ends do not rise by more than one,
- components do not rise by more than one.

## Adaptive router
The next challenge is not a fixed authored sequence.

After a move:
1. Enumerate all one-rotation moves for each structural challenge.
2. Prefer a challenge other than the previous one when possible.
3. Prefer 2–6 valid moves.
4. If none exists, choose REWIRE and calculate a focus cell with a useful number of valid local moves.
5. Recalculate the REWIRE focus after each state change.
6. If no valid structural or REWIRE move exists, archive early.

This prevents the Patch from being artificially kept alive by meaningless turns.

## Starter corpus
`starter_patches.json` contains 20 seeds.

## Stress test
The test suite validates the 20 starting states, primary moves, same-player rejection, version progression, and multi-step adaptive successor paths.

The product hypothesis is not “people like the puzzle.”
It is:

`contribute → leave → another human changes it → return → inspect delta → contribute again`

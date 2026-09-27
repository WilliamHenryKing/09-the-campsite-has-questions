import type { CaseDef, CharacterId } from "./types";

export const CAST: Record<CharacterId, { name: string; role: string }> = {
  gus: { name: "Warden Gus", role: "Keeper of the emergency bell" },
  marge: { name: "Marge", role: "Hammock enthusiast" },
  pip: { name: "Pip", role: "Junior camper, heat-averse" },
};

const picnic: CaseDef = {
  id: "picnic",
  number: 1,
  title: "The Stolen Picnic",
  time: "afternoon",
  reportedBy: "gus",
  complaint:
    "PICNIC STOLEN. Table found empty at three o'clock. Emergency bell rung. Suspect: raccoon (large).",
  events: [
    { id: "nap", label: "Marge dozes off and her book slides onto the grass" },
    { id: "chair", label: "The folding chair is dragged under the oak" },
    { id: "basket", label: "The picnic basket is carried off the table" },
  ],
  explanations: [
    { id: "shade", label: "Pip moved the picnic to follow the shade" },
    { id: "raccoon", label: "A raccoon ran off with the picnic" },
  ],
  clues: [
    {
      id: "book",
      name: "Marge's fallen book",
      fact: "The book lies splayed on the grass under the hammock. The chair's drag grooves bend neatly around it.",
      note: "The book was already down when the chair was dragged.",
      constraint: { kind: "before", first: "nap", after: "chair" },
    },
    {
      id: "drips",
      name: "Lemonade drip trail",
      fact: "Sticky drips run from the table to the oak. They sit on top of the chair's drag grooves, never inside them.",
      note: "The chair moved before the basket did.",
      constraint: { kind: "before", first: "chair", after: "basket" },
    },
    {
      id: "sunclock",
      name: "The sun clock",
      fact: "Its shadow points to three. At three the table is in full sun, and the only shade in camp falls under the oak, exactly where the chair and the blanket-covered basket now sit.",
      note: "The picnic followed the shade.",
      constraint: { kind: "explanation", id: "shade" },
    },
  ],
  statements: [
    { character: "gus", text: "I rang the bell at once. Emergency Procedure 4b: Missing Lunch." },
    {
      character: "marge",
      text: "I saw the whole thing. A raccoon the size of a canoe. Wide awake, I was.",
      contradictedBy: "book",
    },
    { character: "pip", text: "I've been in the shade. Just being cool. Unrelated to sandwiches." },
  ],
  truth: { order: ["nap", "chair", "basket"], explanation: "shade" },
  verdict:
    "Pip dragged the chair into the oak's shade, then carried the picnic over to it. Nothing was stolen, only relocated. Marge slept through all of it.",
};

const tent: CaseDef = {
  id: "tent",
  number: 2,
  title: "The Missing Tent",
  time: "rain",
  reportedBy: "marge",
  complaint:
    "TENT MISSING from pitch 2. Kettle knocked off the fire. Suspect: the weather, in general.",
  events: [
    { id: "rain", label: "Rain begins to fall" },
    { id: "pegs", label: "The tent pegs are pulled up" },
    { id: "kettle", label: "The kettle tips off the fire" },
  ],
  explanations: [
    { id: "poncho", label: "Gus pulled up the tent to wear as a rain cape" },
    { id: "wind", label: "A gust blew the tent into the lake" },
  ],
  clues: [
    {
      id: "pitch",
      name: "The empty pitch",
      fact: "The four pegs are stacked neatly by the pitch. The grass where the tent stood is bone dry, though everything around it is soaked.",
      note: "The tent was still up when the rain began.",
      constraint: { kind: "before", first: "rain", after: "pegs" },
    },
    {
      id: "kettle",
      name: "The tipped kettle",
      fact: "A thread of green canvas is snagged on the kettle's handle. Tent-green. Tent-thick.",
      note: "The kettle was knocked over by the tent, after it came off its pegs.",
      constraint: { kind: "before", first: "pegs", after: "kettle" },
    },
    {
      id: "windsock",
      name: "The windsock",
      fact: "It hangs straight down, limp and dripping. The rain falls straight down too. There has been no wind all evening.",
      note: "No gust took the tent.",
      constraint: { kind: "explanation", id: "poncho" },
    },
  ],
  statements: [
    {
      character: "pip",
      text: "A massive gust! Whoosh! The tent flew right over the lake. Probably. I was in the loo.",
      contradictedBy: "windsock",
    },
    {
      character: "gus",
      text: "This? It's a cape. Regulation weatherwear. Irrelevant to the enquiry.",
    },
    { character: "marge", text: "Somebody knocked my kettle over. Somebody rustly." },
  ],
  truth: { order: ["rain", "pegs", "kettle"], explanation: "poncho" },
  verdict:
    "When the rain began, Gus unpegged the tent and wore it as a cape, then swept the kettle off the fire with its hem. The tent is missing only in the sense that Gus is inside it.",
};

const bell: CaseDef = {
  id: "bell",
  number: 3,
  title: "The Bell at Dawn",
  time: "dawn",
  reportedBy: "gus",
  complaint:
    "EMERGENCY BELL RUNG AT DAWN. Picnic table moved by unknown force. Suspect: bear (probable).",
  events: [
    { id: "tie", label: "The hammock is tied between the table and the bell post" },
    { id: "dew", label: "Dew settles on the meadow" },
    { id: "lurch", label: "The table lurches and the bell rings" },
  ],
  explanations: [
    { id: "hammock", label: "Marge climbed into her hammock and tugged the table" },
    { id: "bear", label: "A bear shoved the table and rang the bell" },
  ],
  clues: [
    {
      id: "knots",
      name: "The hammock knot",
      fact: "Where the rope wraps the table leg it is perfectly dry. The outside of the knot is beaded with dew.",
      note: "The hammock was tied before the dew fell.",
      constraint: { kind: "before", first: "tie", after: "dew" },
    },
    {
      id: "grooves",
      name: "The table's drag marks",
      fact: "Two dark grooves cut through the silvery dew. No dew has settled inside them.",
      note: "The table moved after the dew fell.",
      constraint: { kind: "before", first: "dew", after: "lurch" },
    },
    {
      id: "cord",
      name: "The bell cord",
      fact: "The bell's pull-cord is knotted to the hammock line. Every time the hammock sags, the bell clangs.",
      note: "The hammock rang the bell.",
      constraint: { kind: "explanation", id: "hammock" },
    },
  ],
  statements: [
    {
      character: "gus",
      text: "A BEAR. Ringing for its breakfast. I'd know that clang anywhere.",
      contradictedBy: "cord",
    },
    { character: "marge", text: "Slept like a log. Didn't move a muscle. Wonderful hammock." },
    { character: "pip", text: "I heard a creak, then a clang, then Gus shouting 'BEAR'." },
  ],
  truth: { order: ["tie", "dew", "lurch"], explanation: "hammock" },
  verdict:
    "Marge tied her hammock to the table at dusk. At dawn she climbed in, the table lurched, and the knotted cord rang the bell. No bears were involved.",
};

export const CASES: readonly CaseDef[] = [picnic, tent, bell];

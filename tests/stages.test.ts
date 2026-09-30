import { afterAll, describe, expect, test } from "bun:test";
import gsap from "gsap";
import { CASES } from "../src/game/cases";
import type { CaseDef } from "../src/game/types";
import { setCueHandler } from "../src/scene/cues";
import { bellStage } from "../src/scene/stages/bell";
import { picnicStage } from "../src/scene/stages/picnic";
import type { ReconstructionContext, Stage } from "../src/scene/stages/stage";
import { tentStage } from "../src/scene/stages/tent";
import { World } from "../src/scene/world";

const stages = [picnicStage, tentStage, bellStage];
const picnicCase = CASES[0] as CaseDef;
const tentCase = CASES[1] as CaseDef;
const bellCase = CASES[2] as CaseDef;

function event(stage: Stage, world: World, id: string, context?: ReconstructionContext) {
  const timeline = gsap.timeline({ paused: true });
  stage.event(world, id, timeline, context);
  timeline.totalProgress(1);
  timeline.kill();
}

function explain(stage: Stage, world: World, id: string, context?: ReconstructionContext) {
  const timeline = gsap.timeline({ paused: true });
  stage.explain(world, id, timeline, context);
  timeline.totalProgress(1);
  timeline.kill();
}

function events(
  stage: Stage,
  world: World,
  order: readonly string[],
  context?: ReconstructionContext,
) {
  for (const id of order) event(stage, world, id, context);
}

afterAll(() => {
  setCueHandler(() => {});
  gsap.ticker.sleep();
});

describe("a test reconstruction stages the player's cause", () => {
  test("without a cause, object changes do not implicate Pip, Gus or Marge", () => {
    const context: ReconstructionContext = { mode: "test", explanation: null };
    const picnic = new World();
    picnicStage.before(picnic);
    const pip = picnic.cast.pip.root.position.toArray();
    events(picnicStage, picnic, picnicCase.truth.order, context);
    expect(picnic.cast.pip.root.position.toArray()).toEqual(pip);
    expect(picnic.basket.position.y).toBe(0);

    const tent = new World();
    tentStage.before(tent);
    const gus = tent.cast.gus.root.position.toArray();
    events(tentStage, tent, tentCase.truth.order, context);
    expect(tent.cast.gus.root.position.toArray()).toEqual(gus);
    expect(tent.cast.gus.cape.visible).toBe(false);
    expect(tent.kettle.rotation.z).toBe(1.4);

    const bell = new World();
    bellStage.before(bell);
    const marge = bell.cast.marge.root.position.toArray();
    events(bellStage, bell, bellCase.truth.order, context);
    expect(bell.cast.marge.root.position.toArray()).toEqual(marge);
    expect(bell.cast.marge.root.rotation.z).toBe(0);
    expect(bell.table.position.x).toBeCloseTo(0.3);
  });

  test("the raccoon hypothesis carries the basket without showing Pip steal it first", () => {
    const context: ReconstructionContext = { mode: "test", explanation: "raccoon" };
    const world = new World();
    picnicStage.before(world);
    const pip = world.cast.pip.root.position.toArray();
    events(picnicStage, world, picnicCase.truth.order, context);
    const thief = world.extras.getObjectByName("reconstruction-raccoon");
    expect(thief).toBeDefined();
    expect(world.cast.pip.root.position.toArray()).toEqual(pip);
    explain(picnicStage, world, "raccoon", context);
    expect(world.basket.visible).toBe(false);
    expect(world.basket.position.x).toBe(6.75);
    expect(thief?.visible).toBe(false);
  });

  test("the wind hypothesis lifts the existing tent without dressing Gus in it", () => {
    const context: ReconstructionContext = { mode: "test", explanation: "wind" };
    const world = new World();
    tentStage.before(world);
    const gus = world.cast.gus.root.position.toArray();
    events(tentStage, world, tentCase.truth.order, context);
    expect(world.cast.gus.root.position.toArray()).toEqual(gus);
    expect(world.cast.gus.cape.visible).toBe(false);
    expect(world.tent.visible).toBe(true);
    expect(world.tent.position.x).toBe(-0.9);
    const extras = world.extras.children.length;
    explain(tentStage, world, "wind", context);
    expect(world.tent.visible).toBe(false);
    expect(world.extras.children).toHaveLength(extras);
  });

  test("rain after the hypothetical tent removal cannot leave the pitch dry", () => {
    const context: ReconstructionContext = { mode: "test", explanation: "wind" };
    const world = new World();
    tentStage.before(world);
    const patch = world.extras.children[0];
    event(tentStage, world, "pegs", context);
    event(tentStage, world, "rain", context);
    expect(patch?.visible).toBe(false);

    world.reset();
    tentStage.before(world);
    const sheltered = world.extras.children[0];
    event(tentStage, world, "rain", context);
    event(tentStage, world, "pegs", context);
    expect(sheltered?.visible).toBe(true);
  });

  test("the bear causes one lurch and bell-ring, without Marge climbing into the hammock", () => {
    const context: ReconstructionContext = { mode: "test", explanation: "bear" };
    const world = new World();
    bellStage.before(world);
    const marge = world.cast.marge.root.position.toArray();
    let rings = 0;
    setCueHandler((name) => {
      if (name === "bell") rings++;
    });
    events(bellStage, world, bellCase.truth.order, context);
    const suspect = world.extras.getObjectByName("reconstruction-bear");
    expect(suspect).toBeDefined();
    expect(world.cast.marge.root.position.toArray()).toEqual(marge);
    expect(world.cast.marge.root.rotation.z).toBe(0);
    expect(rings).toBe(1);
    explain(bellStage, world, "bear", context);
    expect(rings).toBe(1);
    expect(suspect?.visible).toBe(false);
    setCueHandler(() => {});
  });

  test("a lurch before the tying beat cannot invent a hammock", () => {
    for (const explanation of [null, "bear", "hammock"]) {
      const context: ReconstructionContext = { mode: "test", explanation };
      const world = new World();
      bellStage.before(world);
      event(bellStage, world, "lurch", context);
      expect(world.hammock).toBeNull();
      event(bellStage, world, "tie", context);
      expect(world.hammock).not.toBeNull();
    }
  });

  test("returning to the found scene removes each alternative and restores the case", () => {
    for (const [index, stage] of stages.entries()) {
      const def = CASES[index] as CaseDef;
      const alternative = def.explanations[1]?.id;
      if (!alternative) throw new Error(`No alternative explanation in ${def.id}`);
      const context: ReconstructionContext = { mode: "test", explanation: alternative };
      const world = new World();
      stage.before(world);
      events(stage, world, def.truth.order, context);
      explain(stage, world, alternative, context);
      world.reset();
      stage.found(world);
      expect(world.extras.getObjectByName("reconstruction-raccoon")).toBeUndefined();
      expect(world.extras.getObjectByName("reconstruction-bear")).toBeUndefined();
      expect(world.basket.visible).toBe(index === 0);
      expect(world.tent.visible).toBe(index !== 1);
      expect(world.cast.gus.cape.visible).toBe(index === 1);
    }
  });
});

describe("the official reconstruction retains its character performance", () => {
  for (const context of [undefined, { mode: "payoff", explanation: null } as const]) {
    test(`${context ? "explicit payoff" : "legacy caller"} shows the true actors and outcomes`, () => {
      const picnic = new World();
      picnicStage.before(picnic);
      events(picnicStage, picnic, picnicCase.truth.order, context);
      explain(picnicStage, picnic, "shade", context);
      expect(picnic.cast.pip.root.position.x).toBe(-4.0);
      expect(picnic.basket.visible).toBe(true);

      const tent = new World();
      tentStage.before(tent);
      events(tentStage, tent, tentCase.truth.order, context);
      explain(tentStage, tent, "poncho", context);
      expect(tent.cast.gus.cape.visible).toBe(true);
      expect(tent.tent.visible).toBe(false);
      expect(tent.cast.gus.root.position.x).toBe(-0.3);

      const bell = new World();
      bellStage.before(bell);
      events(bellStage, bell, bellCase.truth.order, context);
      explain(bellStage, bell, "hammock", context);
      expect(bell.cast.marge.root.rotation.z).toBe(Math.PI / 2);
      expect(bell.table.position.x).toBeCloseTo(0.3);
      expect(bell.asleep.has("gus")).toBe(false);
    });
  }
});

import { expect, test } from "@playwright/test";
import { CASES, CAST } from "../src/game/cases";

test("collect evidence, reject a wrong report, solve all three cases and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?e2e");
  await page.waitForFunction(() => !document.getElementById("arrival"), null, { timeout: 90_000 });
  await page.getByRole("button", { name: "Skip the guide", exact: true }).click();
  for (const [index, def] of CASES.entries()) {
    if (index > 0)
      await page.getByRole("button", { name: "Begin investigation", exact: true }).click();
    for (const clue of def.clues) {
      const tag = page.getByRole("button", { name: `Inspect ${clue.name}`, exact: true });
      await tag.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Turn right", exact: true }).click();
      await page.getByRole("button", { name: "Back to camp", exact: true }).click();
      await expect(
        page.getByRole("button", { name: `Inspect ${clue.name} (examined)`, exact: true }),
      ).toBeFocused();
    }
    for (const statement of def.statements) {
      await page
        .getByRole("button", { name: `Talk to ${CAST[statement.character].name}`, exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Thank you", exact: true }).click();
    }
    await page.getByRole("button", { name: "Incident Board", exact: true }).click();
    const truth = def.explanations.find((explanation) => explanation.id === def.truth.explanation);
    expect(truth).toBeDefined();
    await page.getByRole("radio", { name: truth?.label, exact: true }).check();
    if (index === 0) {
      await page.getByRole("button", { name: "File report", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Report returned");
      await page.getByRole("button", { name: "Test against the scene", exact: true }).click();
      await page
        .getByRole("button", { name: "Back to the board", exact: true })
        .waitFor({ timeout: 45_000 });
      await expect(page.locator(".outcome")).toContainText("Contradiction");
      await page.getByRole("button", { name: "Back to the board", exact: true }).click();
    }
    // Reverse-order starting board: move the first truth event twice, then the middle once.
    const labels = def.truth.order.map(
      (id) => def.events.find((event) => event.id === id)?.label ?? id,
    );
    for (const label of [labels[0], labels[0], labels[1]]) {
      await page.getByRole("button", { name: `Move earlier: ${label}`, exact: true }).click();
    }
    await expect(page.locator(".event-label")).toHaveText(labels);
    await page.getByRole("button", { name: "Test against the scene", exact: true }).click();
    await page
      .getByRole("button", { name: "File this report", exact: true })
      .waitFor({ timeout: 60_000 });
    await expect(page.locator(".outcome")).toContainText("Every beat is backed by evidence");
    await page.getByRole("button", { name: "File this report", exact: true }).click();
    await page
      .getByRole("button", {
        name: index === 2 ? "Close the season's log" : "Next incident",
        exact: true,
      })
      .click({ timeout: 60_000 });
  }
  await expect(
    page.getByRole("heading", { name: "The campsite has no further questions" }),
  ).toBeVisible();
  await expect(page.locator(".finding")).toContainText("8 of 9 acorns");
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await page.getByRole("button", { name: "Begin investigation", exact: true }).click();
  await expect(page.locator(".hud-count")).toHaveText("Evidence 0/3 · Statements 0/3");
  expect(errors).toEqual([]);
});

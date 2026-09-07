import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyReturnAction } from "./weekly-return-action";

test("weekly return action uses the shared label and a 44px target", () => {
  const html = renderToStaticMarkup(<WeeklyReturnAction onReturn={() => undefined} />);
  assert.match(html, /주간 계획으로 돌아가기/);
  assert.match(html, /type="button"/);
  assert.match(html, /h-11/);
});

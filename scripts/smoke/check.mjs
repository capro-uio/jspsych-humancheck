import "./dom.mjs";

const { initJsPsych } = await import("jspsych");
const { default: HumanCheck } = await import("@jspsych-contrib/extension-humancheck");
const { default: buttonResponse } = await import("@jspsych/plugin-html-button-response");

const checks = {
  "default export is the extension": typeof HumanCheck === "function" && HumanCheck.info.name === "humancheck",
  "version is set from package.json": /^\d+\.\d+\.\d+/.test(HumanCheck.info.version),
  "all data columns declared": Object.keys(HumanCheck.info.data).length === 20,
  "citations compiled in from CITATION.cff":
    typeof HumanCheck.info.citations?.apa === "string" && HumanCheck.info.citations.apa.includes("Mowinckel"),
  "static helpers exposed": ["scoreSession", "collectFromTrials", "probeEnvironment"].every(
    (fn) => typeof HumanCheck[fn] === "function",
  ),
  "DEFAULT_WEIGHTS exposed": typeof HumanCheck.DEFAULT_WEIGHTS?.canary === "number",
};

const jsPsych = initJsPsych({ extensions: [{ type: HumanCheck }] });
await jsPsych.simulate(
  [{ extensions: [{ type: HumanCheck }], timeline: [{ type: buttonResponse, stimulus: "<p>x</p>", choices: ["ok"] }] }],
  "data-only",
);

const rows = jsPsych.data.get().values();
const header = jsPsych.data.get().csv().split("\n")[0];

checks["runs under jsPsych simulation"] = rows.length === 1 && typeof rows[0].humancheck_duration_ms === "number";
checks["declared columns reach the CSV"] = Object.keys(HumanCheck.info.data).every((column) =>
  header.includes(column),
);
checks["scores a bot session"] =
  HumanCheck.scoreSession({
    environment: null,
    behaviors: [],
    checks: [{ honeypot_filled: true, canary_triggered: true, attention_failed: null }],
  }).score > 0.9;

let failed = 0;
for (const [name, ok] of Object.entries(checks)) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${name}`);
}
process.exit(failed === 0 ? 0 : 1);

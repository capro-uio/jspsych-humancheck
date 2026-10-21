import HumanCheck from "@jspsych-contrib/extension-humancheck";
import type { Flag, FlagId, HumanCheckSummary } from "@jspsych-contrib/extension-humancheck";

const summary: HumanCheckSummary = HumanCheck.scoreSession({ environment: null, behaviors: [], checks: [] });
const ids: FlagId[] = summary.flags.map((flag: Flag) => flag.id as FlagId);
const weights: Record<FlagId, number> = HumanCheck.DEFAULT_WEIGHTS;

export { ids, weights };

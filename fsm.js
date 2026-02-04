
const fsm = require("./fsm.json");
const actionMap = require("./action");

const fsmToString = (fsm) => {
  let out = "FSM {\n";
  for (const [name, state] of Object.entries(fsm.状態群)) {
    out += `  ${name}:\n`;
    if (state.Act) out += `    Act = ${state.Act}\n`;
    if (state.完了時) out += `    完了時 → ${state.完了時}\n`;
  }
  out += "}";
  return out;
}

const contextToString = (fsm) => {
  let out = "Context {\n";
  for (const [key, value] of Object.entries(fsm.文脈)) {
    out += `  ${key}: ${value}\n`;
  }
  out += "}";
  return out;
}

fsm.状態群.log = () => console.log(fsmToString(fsm));
fsm.文脈.log = () => console.log(contextToString(fsm));

const tick = () =>
{
  console.clear();
  fsm.状態群.log();
  fsm.文脈.log();
  const current    = fsm.文脈.今の状態;
  const state      = fsm.状態群[current];
  const actionName = state.Act;
  const action     = actionMap.get(actionName);

  action(fsm.文脈, state);
}

tick();

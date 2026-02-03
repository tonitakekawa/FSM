#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const fsmPath = process.argv[2] || "fsm.json";
const resolvedPath = path.resolve(process.cwd(), fsmPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`FSM file not found: ${resolvedPath}`);
  process.exit(1);
}

const rawFsm = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
const { actions: actionHandlers } = require("./action");

function normalizeFsm(input) {
  const context = input.context ?? input["文脈"] ?? {};
  const initial =
    input.initial ??
    input["初期状態"] ??
    context["状態"];
  const rawStates = input.states ?? input["状態"];
  if (!initial) {
    throw new Error("Missing initial state: `initial` or `初期状態`");
  }
  if (!rawStates || typeof rawStates !== "object") {
    throw new Error("Missing states: `states` or `状態`");
  }

  const states = {};
  for (const [stateName, def] of Object.entries(rawStates)) {
    if (!def || typeof def !== "object") {
      throw new Error(`Invalid state definition: ${stateName}`);
    }

    const rawActions = def.on_enter ?? def["アクション"] ?? [];
    const onEnter = rawActions.map((action) => {
      if (typeof action === "string") {
        return action;
      }
      if (action && typeof action === "object") {
        const type = action.type ?? action["名前"];
        if (!type) {
          return action;
        }
        return { ...action, type };
      }
      return action;
    });
    const onTick = def.on_tick ?? [];
    const transitionsRaw = def.transitions ?? def["遷移"] ?? [];
    const transitions = transitionsRaw.map((t) => ({
      event: t.event ?? t["イベント"],
      to: t.to ?? t["状態"],
    }));

    states[stateName] = {
      on_enter: onEnter,
      on_tick: onTick,
      transitions,
    };
  }

  return { initial, states, context };
}

function render() {
  process.stdout.write("\x1b[2J\x1b[H");
  console.log("=== FSM ===");
  for (const stateName of Object.keys(fsm.states)) {
    if (stateName === current) {
      console.log(`> ${stateName}`);
    } else {
      console.log(`  ${stateName}`);
    }
  }
  printAllStates();
}

const fsm = normalizeFsm(rawFsm);

function assertState(name) {
  if (!fsm.states || !fsm.states[name]) {
    throw new Error(`State not found: ${name}`);
  }
}

const builtInActionHandlers = {
  log_state: ({ state }) => console.log(`[action] state=${state}`),
  log_message: ({ message }) => console.log(`[action] ${message}`),
};

const mergedActionHandlers = { ...builtInActionHandlers, ...actionHandlers };

function runActions(actionList, ctx) {
  let chain = Promise.resolve();
  for (const action of actionList || []) {
    chain = chain.then(() => {
      if (typeof action === "string") {
        const fn = mergedActionHandlers[action];
        if (!fn) {
          console.warn(`[warn] action handler not found: ${action}`);
          return;
        }
        return fn(ctx);
      }

      if (action && typeof action === "object" && action.type) {
        const fn = mergedActionHandlers[action.type];
        if (!fn) {
          console.warn(`[warn] action handler not found: ${action.type}`);
          return;
        }
        return fn({ ...ctx, ...action });
      }

      console.warn(`[warn] invalid action: ${JSON.stringify(action)}`);
    });
  }
  return chain;
}

let current = fsm.initial;
const context = { ...fsm.context };
assertState(current);

function enterState(state, meta = {}) {
  current = state;
  render();
  context["状態"] = current;
  const def = fsm.states[current];
  return runActions(def.on_enter, {
    state: current,
    context,
    emit: send,
    ...meta,
  }).then(() => {
    if (isTerminal(current)) {
      running = false;
    }
  });
}

function tick(meta = {}) {
  render();
  const def = fsm.states[current];
  return runActions(def.on_tick, {
    state: current,
    context,
    emit: send,
    ...meta,
  });
}

function handleEvent(event, meta = {}) {
  const def = fsm.states[current];
  const transition = (def.transitions || []).find((t) => t.event === event);
  if (!transition) {
    console.warn(`[warn] no transition for event="${event}" in state="${current}"`);
    return Promise.resolve();
  }
  assertState(transition.to);
  return enterState(transition.to, { event, ...meta });
}

const eventQueue = [];
let processing = false;
let processingPromise = null;
let running = true;

function isTerminal(state) {
  if (state === "完了") return true;
  const def = fsm.states[state];
  return !def || (def.transitions || []).length === 0;
}

function processQueue() {
  if (processing) return processingPromise;
  processing = true;
  processingPromise = new Promise((resolve, reject) => {
    const step = () => {
      if (!running || eventQueue.length === 0) {
        processing = false;
        if (!running) {
          process.exit(0);
        }
        resolve();
        return;
      }
      const { event, meta } = eventQueue.shift();
      Promise.resolve(handleEvent(event, meta)).then(step, reject);
    };
    step();
  });
  return processingPromise;
}

function send(event, meta = {}) {
  eventQueue.push({ event, meta });
  if (processing) {
    return Promise.resolve();
  }
  return processQueue();
}

function run() {
  return enterState(current, { event: "__init__" }).then(() => {
    if (isTerminal(current)) {
      running = false;
      return;
    }
    return processQueue();
  });
}

console.log(`FSM loaded: ${path.basename(resolvedPath)}`);
console.log(`Initial state: ${current}`);
printAllStates();

function printAllStates() {
  console.log("=== STATES ===");
  for (const stateName of Object.keys(fsm.states)) {
    console.log(`- ${stateName}`);
  }
  console.log("==============");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

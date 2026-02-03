
"use strict";

function getMousePosition() {
  if (typeof global.getMousePosition === "function") {
    return global.getMousePosition();
  }
  return { x: 0, y: 0 };
}

function カーソル位置取得({ context }) {
  const pos = getMousePosition();
  context["カーソル位置"] = [pos.x, pos.y];
}

function カーソル位置出力({ context }) {
  const [x, y] = context["カーソル位置"] || [0, 0];
  console.log(`カーソル位置: ${x}, ${y}`);
}

function キー入力({ context }) {
  if (typeof context["入力キー"] !== "string") {
    context["入力キー"] = "";
  }
}

function プログラム完了判定({ context }) {
  const key = (context["入力キー"] || "").trim().toLowerCase();
  context["次イベント"] = key === "q" || key === "exit" || key === "終了"
    ? "プログラム完了"
    : "継続";
}

function 一秒待機({ context, emit }) {
  const nextEvent = context["次イベント"] || "継続";
  return new Promise((resolve) => {
    setTimeout(() => {
      emit(nextEvent);
      resolve();
    }, 1000);
  });
}

function 文字出力({ message, "内容": content, context }) {
  const value = typeof message === "string"
    ? message
    : (typeof content === "string" ? content : context["出力文字列"]);
  if (typeof value === "string") {
    console.log(value);
  } else {
    console.warn("[warn] 文字出力: message か context[\"出力文字列\"] が必要です");
  }
}

function イベント({ "イベント名": eventName, event, emit }) {
  const name = eventName ?? event;
  if (!name) {
    console.warn("[warn] イベント: イベント名が必要です");
    return Promise.resolve();
  }
  emit(name);
  return Promise.resolve();
}

function キー出力({ context, "出力内容": outputKey }) {
  const key = outputKey ?? "入力キー";
  const value = context[key];
  console.log(String(value ?? ""));
}

function 待機_ミリ秒({ "待機時間": waitMs, "出力イベント": outEvent, emit }) {
  const ms = Number.isFinite(waitMs) ? waitMs : 1000;
  const eventName = outEvent ?? "継続";
  return new Promise((resolve) => {
    setTimeout(() => {
      emit(eventName);
      resolve();
    }, ms);
  });
}

function プログラム完了() {
  console.log("🔚");
}

const actions = {
  "イベント": イベント,
  "待機（ミリ秒）": 待機_ミリ秒,
  "プログラム完了": プログラム完了,
  "カーソル位置取得": カーソル位置取得,
  "カーソル位置出力": カーソル位置出力,
  "キー入力": キー入力,
  "キー出力": キー出力,
  "プログラム完了判定": プログラム完了判定,
  "文字出力": 文字出力,
};

module.exports = { actions };

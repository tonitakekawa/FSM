
const 待機ミリ秒 = (文脈, 状態) =>
{
  return new Promise((resolve) => {
      setTimeout(() => {
          resolve();
          文脈.メッセージキュー.push(状態.完了時);
      }, 状態.待機時間);
  });
}

const FSM読み込み = () =>
{
  return "FSM読み込み完了";
}
  
const アクション実行 = () =>
{
  return "アクション実行完了";
}         
const メッセージ待ち = () =>
{
  return "メッセージ受信完了";
};

const FSM終了 = () =>
{
  return "FSM終了";
};

const actionMap = new Map([
  ["待機（ミリ秒）", 待機ミリ秒],
  ["FSM読み込み", FSM読み込み],
  ["アクション実行", アクション実行],
  ["メッセージ待ち", メッセージ待ち],
  ["FSM終了", FSM終了],
]);


module.exports = actionMap;
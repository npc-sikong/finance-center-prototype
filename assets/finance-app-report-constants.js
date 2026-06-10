"use strict";

const financeStatTabs = [
  "统计总览",
  "官方账户收支",
  "三方清算",
  "提现待付",
  "红包待领",
  "奖励成本",
  "月结应收",
  "场馆费应付",
  "游戏结算",
  "信用台账余额"
];

function closeLoopSummary(rows = closedLoopControlRows()) {
  const prototypeClosed = rows.filter(row => /原型.*闭环|已补齐|已隔离/.test(`${row.闭环状态} ${row.原型闭环说明}`)).length;
  const backendPending = rows.filter(row => /后端待落地|需补|待补|需统一入口/.test(row.后端落地状态 || "")).length;
  const needConfirm = rows.filter(row => /需确认|历史治理|交易类型冲突|重复/.test(`${row.闭环分类} ${row.后端落地状态} ${row.核销状态}`)).length;
  const blockers = rows.filter(row => /暂缓锁账|阻断|差异|待清算|部分清算|需确认/.test(`${row.关账判断} ${row.核销状态}`)).length;
  return {
    total: rows.length,
    prototypeClosed,
    backendPending,
    needConfirm,
    blockers,
    diffAmount: rows.reduce((acc, row) => acc + Math.abs(Number(row.差异金额 || 0)), 0)
  };
}

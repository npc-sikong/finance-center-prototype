"use strict";

function seedCloseLoopLedgerRecords(rows, definitions, vouchers) {
  return (rows || []).map((row, index) => {
    const def = closeLoopLedgerDefinition(row, definitions);
    const voucher = closeLoopVoucher(row, vouchers);
    const amount = closeLoopAmount(row);
    const direction = closeLoopDirection(row);
    const beforeBalance = 30000 + index * 1700;
    const afterBalance = beforeBalance + (direction === "减少" ? -amount : amount);
    return {
      id: `CL-LEDGER-${row.缺口编号}`,
      ledgerModule: def.模块 || row.闭环主题,
      tableName: def.建议表名 || firstLedgerName(row.账本),
      ledgerNature: def.账本性质 || (/信用|来源/.test(row.报表科目 || "") ? "信用/来源台账" : "正式资金账本"),
      businessEntity: def.业务主体 || row.责任模块 || "",
      postingScope: /900|不直接|来源字段|信用/.test(`${row.报表科目 || ""} ${row.闭环状态 || ""}`) ? "信用/来源台账" : "正式分录",
      controlLedger: /900|不直接|来源字段|信用/.test(`${row.报表科目 || ""} ${row.闭环状态 || ""}`) ? "是" : "否",
      editablePolicy: "否",
      reversiblePolicy: "是",
      actionPolicy: "通过原业务、凭证或核销流程处理；原型记录不代表后端已真实落表",
      currentPostingStatus: row.闭环状态,
      backendPostingStatus: row.后端落地状态,
      priority: row.优先级 || priorityByIndex(index),
      sourceId: `CL-SRC-${String(index + 1).padStart(3, "0")}`,
      sourceTable: row.源单,
      sourceDoc: row.源单,
      subject: row.责任模块,
      direction,
      amount,
      status: row.核销状态,
      voucherNo: voucher?.voucherNo || "",
      templateCode: row.关联模板 || voucher?.templateCode || "",
      reconciliationId: row.核销关系,
      coverage: row.闭环状态,
      gapId: row.缺口编号,
      supplementNote: row.原型闭环说明,
      closeLoopKey: row.闭环分类,
      closeLoopName: row.闭环主题,
      supplementLedger: row.账本,
      reconciliationKey: row.核销关系,
      idempotencyKey: [row.源单, `CL-SRC-${String(index + 1).padStart(3, "0")}`, row.凭证规则].join(" + "),
      updatedAt: now(-(index * 13 + 5)),
      beforeBalance,
      afterBalance,
      closePeriod: currentSeedPeriod(index),
      ageHours: row.账龄小时,
      diffAmount: Number(row.差异金额 || 0),
      nextAction: row.下一步动作,
      note: `${row.结账影响}；${row.真实后端边界 || row.后端落地状态 || ""}`
    };
  });
}

function seedCloseLoopReconciliationRecords(rows, vouchers) {
  return (rows || []).map((row, index) => {
    const voucher = closeLoopVoucher(row, vouchers);
    const sourceId = `CL-SRC-${String(index + 1).padStart(3, "0")}`;
    return {
      id: `CL-RECON-${row.缺口编号}`,
      ruleId: firstReconciliationId(row.核销关系),
      object: row.闭环主题,
      sourceId,
      sourceTable: row.源单,
      sourceDoc: row.源单,
      amount: closeLoopAmount(row),
      status: row.核销状态,
      diff: Number(row.差异金额 || 0),
      updatedAt: now(-(index * 11 + 4)),
      standard: row.结账影响,
      risk: row.缺口编号,
      gapId: row.缺口编号,
      supplementNote: row.原型闭环说明,
      closeLoopKey: row.闭环分类,
      closeLoopName: row.闭环主题,
      supplementLedger: row.账本,
      reconciliationKey: row.核销关系,
      idempotencyKey: [row.源单, sourceId, row.凭证规则].join(" + "),
      voucherNo: voucher?.voucherNo || "",
      reportSubject: row.报表科目,
      owner: row.负责人,
      backendStatus: row.后端落地状态,
      nextAction: row.下一步动作,
      closeImpact: row.结账影响
    };
  });
}

function closeLoopLedgerDefinition(row, definitions) {
  const text = normalizeText(row.账本 || row.源单 || "");
  return definitions.find(def => {
    return [def.建议表名, def.源表, def.模块].filter(Boolean).some(value => text.includes(normalizeText(value)) || normalizeText(value).includes(text));
  }) || definitions.find(def => normalizeText(row.责任模块 || "").includes(normalizeText(def.模块 || ""))) || definitions[0] || {};
}

function closeLoopVoucher(row, vouchers) {
  const text = `${row.凭证规则 || ""} ${row.关联模板 || ""}`;
  const ids = text.split(/[；;\/，,、]/).map(item => item.trim()).filter(Boolean);
  return (vouchers || []).find(batch => ids.includes(batch.ruleId) || ids.some(id => templateMatches(batch.templateCode, [id]))) || null;
}

function closeLoopAmount(row) {
  const tokens = String(row.金额变量 || "W").split(/[\/，,、;]/).map(item => item.trim()).filter(Boolean);
  return evaluateAmount(tokens[0] || row.金额变量 || "W");
}

function closeLoopDirection(row) {
  const text = `${row.闭环主题 || ""} ${row.结账影响 || ""}`;
  if (/出款|付款|扣|退回|冲减|减少/.test(text)) return "减少";
  if (/隔离|来源|信用/.test(text)) return "信用";
  return "增加";
}

function firstLedgerName(value) {
  return String(value || "").split(/[；;\/，,、]/).map(item => item.trim()).filter(Boolean)[0] || "";
}

function firstReconciliationId(value) {
  return String(value || "").split(/[；;\/，,、]/).map(item => item.trim()).filter(Boolean)[0] || "";
}

function currentSeedPeriod(index) {
  const date = new Date();
  date.setMonth(date.getMonth() - (index % 2));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function seedReconciliationRecords() {
  return data("reconciliationRules").flatMap((rule, index) => {
    const statuses = String(rule.状态 || "待清算/已清算/差异").replace(/待核销/g, "待清算").replace(/已核销/g, "已清算").split(/[\/,，]/).filter(Boolean);
    const closeLoop = data("closeLoopChains").find(row => row.核销关系 === rule.核销ID) || {};
    return [0, 1].map((offset) => ({
      id: `${rule.核销ID || `REC-${index + 1}`}-${offset + 1}`,
      ruleId: rule.核销ID || `REC-${String(index + 1).padStart(3, "0")}`,
      object: rule.核销对象 || "",
      sourceId: `RECON-SRC-${String(80200 + index * 5 + offset)}`,
      sourceTable: closeLoop.业务源单 || "reconciliation_source",
      sourceDoc: closeLoop.业务源单 || "reconciliation_source",
      amount: [sample.G, sample.N, sample.F, sample.settle, sample.VF][(index + offset) % 5],
      status: statuses[(index + offset) % statuses.length] || "待清算",
      diff: offset === 1 && index % 4 === 0 ? sample.F : 0,
      updatedAt: now(-(index * 9 + offset)),
      standard: rule.验收标准 || "",
      risk: rule.关联风险 || "",
      gapId: rule.gapId || "",
      supplementNote: rule.supplementNote || closeLoop.财务口径 || "",
      closeLoopKey: closeLoop.链路类型 || "",
      closeLoopName: closeLoop.链路名称 || "",
      supplementLedger: closeLoop.补记账本 || "",
      reconciliationKey: rule.核销ID || closeLoop.核销关系 || "",
      idempotencyKey: [closeLoop.业务源单 || "reconciliation_source", `RECON-SRC-${String(80200 + index * 5 + offset)}`, closeLoop.关联模板 || rule.核销ID || ""].join(" + ")
    }));
  });
}

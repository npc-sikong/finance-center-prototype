"use strict";
function closedLoopControlRows() {
      const rows = (state.closeLoopControl && state.closeLoopControl.length ? state.closeLoopControl : buildCloseLoopControlRows()).map((row, index) => {
        const voucher = closeLoopRowVoucher(row);
        const ledger = closeLoopRowLedger(row);
        const recon = closeLoopRowReconciliation(row);
        const diff = Number(recon?.diff ?? row.差异金额 ?? 0);
        const status = recon?.status || row.核销状态 || "";
        return {
          ...row,
          凭证号: voucher?.voucherNo || "",
          账本记录: ledger?.id || "",
          账本状态: ledger?.status || row.闭环状态 || "",
          核销状态: status,
          差异金额: diff,
          账龄小时: Number(recon?.ageHours || ledger?.ageHours || row.账龄小时 || 0),
          金额: Number(recon?.amount || ledger?.amount || closeLoopDisplayAmount(row) || 0),
          关账判断: closeLoopCloseDecision(row, status, diff),
          排序: index + 1
        };
      });
      return rows.sort((a, b) => compare(a.排序, b.排序));
    }
    function buildCloseLoopControlRows() {
      return (state.gapConfirmations || []).map((gap, index) => {
        const loop = (state.closeLoopChains || []).find(row => String(row.缺口编号 || "").includes(gap.编号)) || {};
        return {
          缺口编号: gap.编号,
          闭环主题: gap["缺口/待确认"],
          闭环分类: "后端待落地",
          闭环状态: "原型闭环已补齐",
          后端落地状态: "后端待落地：静态原型已补演示链路，真实 ruoyi 仍需落表",
          责任模块: "财务/运营",
          负责人: "待分配",
          优先级: gap.优先级 || priorityByIndex(index),
          源单: loop.业务源单 || gap.影响动作 || "",
          凭证规则: loop.关联模板 || "",
          关联模板: loop.关联模板 || "",
          账本: loop.补记账本 || gap.建议 || "",
          核销关系: loop.核销关系 || "",
          报表科目: "按会计科目表匹配",
          结账影响: gap.风险 || "",
          核销状态: "待清算",
          差异金额: 0,
          账龄小时: 24 + index,
          金额变量: "W",
          下一步动作: gap.建议 || "",
          当前代码事实: gap.当前代码事实 || "",
          原型闭环说明: "已在原型中补齐源单、凭证、账本、核销、报表和结账检查。",
          真实后端边界: gap.建议 || "",
          源码依据: gap.源码依据 || ""
        };
      });
    }
    function closeLoopRowVoucher(row) {
      const keys = `${row.凭证规则 || ""} ${row.关联模板 || ""}`
        .split(/[；;\/，,、]/)
        .map(item => item.trim())
        .filter(Boolean);
      return (state.voucherBatches || []).find(batch => keys.includes(batch.ruleId) || keys.some(key => templateMatches(batch.templateCode, [key]))) || null;
    }
    function closeLoopRowLedger(row) {
      const rowText = normalize(`${row.缺口编号 || ""} ${row.账本 || ""} ${row.源单 || ""}`);
      return (state.ledgerRecords || []).find(record => {
        if (record.gapId === row.缺口编号) return true;
        return [record.tableName, record.sourceTable, record.supplementLedger, record.ledgerModule].filter(Boolean).some(value => {
          const text = normalize(value);
          return rowText.includes(text) || text.includes(normalize(row.缺口编号 || ""));
        });
      }) || null;
    }
    function closeLoopRowReconciliation(row) {
      return (state.reconciliationRecords || []).find(record => record.gapId === row.缺口编号 || record.risk === row.缺口编号 || String(record.id || "").includes(row.缺口编号)) || null;
    }
    function closeLoopDisplayAmount(row) {
      const expression = String(row.金额变量 || "W").split(/[；;\/，,、]/).map(item => item.trim()).filter(Boolean)[0] || "W";
      return evaluateAmount(expression);
    }
    function closeLoopCloseDecision(row, status, diff) {
      if (/需确认|交易类型冲突|重复|历史治理/.test(`${row.闭环分类} ${row.后端落地状态} ${status}`)) return "需确认后才能关账";
      if (Number(diff || 0) !== 0 || /待清算|差异|部分清算/.test(status || "")) return "暂缓锁账，需先核销差异";
      if (/信用|来源|隔离/.test(`${row.闭环状态} ${row.报表科目}`)) return "单列复核，不进正式报表";
      if (/后端待落地|需补/.test(row.后端落地状态 || "")) return "原型可演示，生产待落地";
      return "可纳入结账包";
    }
function coverageCheckRows() {
      return (state.actionOverview || []).map(action => {
        const actionName = action.账变动作 || "";
        const templateCodes = expandReferencedTemplateCodes(coverageTemplateCodes(action));
        const templateRows = findTemplatesForAction(action, templateCodes);
        const entryRows = findEntriesForTemplates(templateRows, templateCodes);
        const ruleRows = findRulesForAction(action, templateRows, templateCodes);
        const mappingRows = findMappingsForAction(action, templateRows, templateCodes);
        const impactRows = (state.fundImpactDetails || []).filter(row => row.账变动作 === actionName || row.动作编号 === action.矩阵动作ID);
        const closeRows = findCloseLoopsForAction(action, templateRows, ruleRows, mappingRows);
        const subjectRows = findSubjectsForEntries(entryRows);
        const nonIndependent = coverageIsNonIndependent(action, templateRows, ruleRows, entryRows);
        const needsFormalSubjects = coverageNeedsFormalSubjects(action, templateRows, ruleRows, entryRows);
        const missing = [];
        if (!templateRows.length) missing.push("模板");
        if (!entryRows.length) missing.push("分录");
        if (!ruleRows.length && !nonIndependent) missing.push("凭证规则");
        if (!mappingRows.length && !impactRows.length) missing.push("账本/资金影响");
        if (!closeRows.length && !findReconciliationsForAction(action, ruleRows, mappingRows).length) missing.push("核销关系");
        if (!subjectRows.length && needsFormalSubjects) missing.push("报表科目");
        const gapIds = coverageGapIds(action, closeRows, mappingRows);
        const status = coverageStatus(action, templateRows, ruleRows, missing, nonIndependent, gapIds);
        return {
          动作: actionName,
          类别: action.类别 || "",
          覆盖状态: status,
          优先级: gapIds.includes("GAP001") || gapIds.includes("GAP002") || gapIds.includes("GAP005") || gapIds.includes("GAP007") || gapIds.includes("GAP008") || gapIds.includes("GAP012") ? "P0" : gapIds ? "P1" : "通过",
          入账口径: coveragePostingScope(action, templateRows, ruleRows, needsFormalSubjects),
          模板: templateRows.map(row => row.模板编码).join("；") || action.关联模板 || "-",
          分录行: entryRows.length,
          凭证规则: ruleRows.map(row => row.规则ID).join("；") || "-",
          账本: coverageLedgerText(mappingRows, impactRows, closeRows),
          核销关系: coverageReconciliationText(action, ruleRows, mappingRows, closeRows),
          报表科目: subjectRows.map(row => `${row.科目编码} ${row.科目名称}`).join("；") || "-",
          缺口编号: gapIds || "-",
          备注: coverageRemark(status, missing)
        };
      });
    }
    function coverageCheckSummary(rows = coverageCheckRows()) {
      const complete = rows.filter(row => row.覆盖状态 === "闭环完整").length;
      const nonPosting = rows.filter(row => /来源信用不制证/.test(row.覆盖状态)).length;
      const backendPending = rows.filter(row => row.覆盖状态 === "后端待落地").length;
      return {
        total: rows.length,
        complete,
        nonPosting,
        backendPending,
        incomplete: rows.length - complete - nonPosting - backendPending,
        p0: rows.filter(row => row.优先级 === "P0").length
      };
    }
    function coverageTemplateCodes(action) {
      const direct = resolveTemplateCodes(action.关联模板 || "");
      if (direct.length) return direct;
      return (state.templates || []).filter(row => row.matrixAction === action.账变动作 || row.业务名称 === action.账变动作).map(row => row.模板编码);
    }
    function expandReferencedTemplateCodes(codes) {
      const result = new Set(codes);
      let changed = true;
      while (changed) {
        changed = false;
        const current = Array.from(result);
        const referenced = [
          ...(state.templates || data("templates")),
          ...data("entries")
        ].filter(row => current.some(code => templateMatches(row.模板编码, [code])))
          .flatMap(row => resolveTemplateCodes(row.引用模板 || ""));
        referenced.forEach(code => {
          if (!result.has(code)) {
            result.add(code);
            changed = true;
          }
        });
      }
      return Array.from(result);
    }
    function findTemplatesForAction(action, codes) {
      return (state.templates || data("templates")).filter(row => {
        if (codes.some(code => templateMatches(row.模板编码, [code]))) return true;
        return row.matrixAction === action.账变动作 || row.业务名称 === action.账变动作;
      });
    }
    function findEntriesForTemplates(templateRows, codes) {
      const templateCodes = templateRows.map(row => row.模板编码).concat(codes);
      return data("entries").filter(row => templateCodes.some(code => templateMatches(row.模板编码, [code])));
    }
    function findRulesForAction(action, templateRows, codes) {
      const templateCodes = templateRows.map(row => row.模板编码).concat(codes);
      return (state.voucherRules || data("voucherRules")).filter(row => {
        const ruleCodes = resolveTemplateCodes(row.关联模板 || "");
        const byTemplate = templateCodes.some(code => templateMatches(code, ruleCodes) || ruleCodes.some(ruleCode => templateMatches(code, [ruleCode])));
        const byAction = String(row.matrixAction || "").split(/[；;]/).map(item => item.trim()).includes(action.账变动作);
        return byTemplate || byAction;
      });
    }
    function findMappingsForAction(action, templateRows, codes) {
      const templateCodes = templateRows.map(row => row.模板编码).concat(codes);
      return (state.mappingRows || data("mappingRows")).filter(row => {
        const byTemplate = templateCodes.some(code => templateMatches(row.模板编码, [code]));
        const byAction = [row.业务事件, row.matrixAction, row.源类型值].some(value => String(value || "").includes(action.账变动作));
        return byTemplate || byAction;
      });
    }
    function findCloseLoopsForAction(action, templateRows, ruleRows, mappingRows) {
      const text = [action.账变动作, action.应关注但未完整落表, action.实际落表影响摘要, ...templateRows.map(row => `${row.模板编码} ${row.业务名称}`), ...ruleRows.map(row => `${row.关联模板} ${row.matrixAction}`), ...mappingRows.map(row => `${row["补充表/账本"]} ${row.核销对象}`)].join(" ");
      return (state.closeLoopChains || data("closeLoopChains")).filter(row => {
        return [row.关联模板, row.链路名称, row.业务源单, row.补记账本, row.财务口径]
          .filter(Boolean)
          .some(value => normalize(String(text)).includes(normalize(value)) || normalize(value).includes(normalize(action.账变动作)));
      });
    }
    function findReconciliationsForAction(action, ruleRows, mappingRows) {
      const keys = new Set([
        ...ruleRows.map(row => row.reconciliationKey || row.核销关系 || ""),
        ...mappingRows.map(row => row.核销对象 || row.凭证规则 || "")
      ].filter(Boolean));
      const actionText = normalize(JSON.stringify(action));
      return (state.reconciliationRules || data("reconciliationRules")).filter(row => {
        if (keys.has(row.核销ID) || keys.has(row.核销对象)) return true;
        return normalize(JSON.stringify(row)).split(/[，,、/]/).some(part => part && actionText.includes(part));
      });
    }
    function findSubjectsForEntries(entryRows) {
      const codes = new Set(entryRows.filter(row => row.是否正式分录 !== "否").map(row => String(row.科目编码 || "")).filter(code => code && !code.startsWith("9")));
      return (state.subjects || []).filter(row => codes.has(String(row.科目编码 || row.原始科目编码 || "")));
    }
    function coverageIsNonIndependent(action, templateRows, ruleRows, entryRows) {
      const text = coverageText(action, templateRows, ruleRows);
      const hasFormalEntry = entryRows.some(row => row.是否正式分录 !== "否" && String(row.科目编码 || "") && !String(row.科目编码 || "").startsWith("9"));
      const allRulesNonFormal = ruleRows.length > 0 && ruleRows.every(row => String(row.是否正式制证 || "是") === "否");
      return !hasFormalEntry && (/信用台账|来源字段|不独立制证|非独立制证|不制证|状态模板|引用模板/.test(text) || allRulesNonFormal);
    }
    function coverageNeedsFormalSubjects(action, templateRows, ruleRows, entryRows) {
      const text = coverageText(action, templateRows, ruleRows);
      const hasFormalEntry = entryRows.some(row => row.是否正式分录 !== "否" && String(row.科目编码 || "") && !String(row.科目编码 || "").startsWith("9"));
      if (hasFormalEntry) return true;
      if (ruleRows.length && ruleRows.every(row => String(row.是否正式制证 || "是") === "否")) return false;
      return !/信用台账|来源字段|不独立制证|非独立制证|不制证|状态模板/.test(text);
    }
    function coverageStatus(action, templateRows, ruleRows, missing, nonIndependent, gapIds = "") {
      const text = coverageText(action, templateRows, ruleRows);
      const hasClosedBackendGap = closedLoopControlRows().some(row => String(gapIds || "").includes(row.缺口编号) && /后端待落地|需补|需统一入口/.test(row.后端落地状态 || ""));
      const hasConfirmGap = closedLoopControlRows().some(row => String(gapIds || "").includes(row.缺口编号) && /需确认|历史治理|冲突|重复/.test(`${row.闭环分类} ${row.后端落地状态}`));
      if (nonIndependent) return "来源信用不制证";
      if (hasConfirmGap) return "需确认";
      if (hasClosedBackendGap) return "后端待落地";
      if (missing.length) {
        if (/手续费|待接入正式|需补记|官方账户|三方清算|清算账本/.test(text)) return "后端待落地";
        return `缺${missing.join("、")}`;
      }
      if (/手续费|待接入正式/.test(text) && ruleRows.every(row => String(row.是否正式制证 || "是") === "否")) return "后端待落地";
      return "闭环完整";
    }
    function coveragePostingScope(action, templateRows, ruleRows, needsFormalSubjects) {
      const text = coverageText(action, templateRows, ruleRows);
      if (!needsFormalSubjects) return /手续费|待接入正式/.test(text) ? "来源字段，后端待接清算" : "来源字段/信用台账";
      if (ruleRows.some(row => /结算批量/.test(row.规则性质 || ""))) return "结算批量制证";
      return "正式借贷凭证";
    }
    function coverageRemark(status, missing) {
      if (status === "闭环完整") return "可从动作追踪到模板、分录、规则、账本、核销与报表科目";
      if (status === "来源信用不制证") return "该动作只作为来源字段、状态或信用台账，不单独生成正式借贷凭证";
      if (status === "后端待落地") return missing.length ? `原型闭环已补，生产需补：${missing.join("、")}` : "原型已走通做账链路，真实后端账本或清算仍需落地";
      if (status === "需确认") return "需完成历史治理、交易类型归类或重复发放确认后再纳入自动制证";
      return missing.length ? `需补：${missing.join("、")}` : status;
    }
    function coverageText(action, templateRows, ruleRows) {
      return [
        JSON.stringify(action || {}),
        ...templateRows.map(row => JSON.stringify(row)),
        ...ruleRows.map(row => JSON.stringify(row))
      ].join(" ");
    }
    function coverageGapIds(action, closeRows, mappingRows) {
      const ids = new Set(closeRows.map(row => row.缺口编号).filter(Boolean));
      mappingRows.forEach(row => String(row.gapId || "").split(/[，,、/]/).filter(Boolean).forEach(id => ids.add(id)));
      (state.gapConfirmations || []).forEach(row => {
        const text = `${row.影响动作 || ""} ${row["缺口/待确认"] || ""}`;
        if (String(text).includes(action.账变动作)) ids.add(row.编号);
      });
      return Array.from(ids).join("/");
    }
    function coverageLedgerText(mappingRows, impactRows, closeRows) {
      const values = [
        ...mappingRows.map(row => row["补充表/账本"]),
        ...impactRows.map(row => row.资金模块),
        ...closeRows.map(row => row.补记账本)
      ].filter(Boolean);
      return Array.from(new Set(values)).slice(0, 5).join("；") || "-";
    }
    function coverageReconciliationText(action, ruleRows, mappingRows, closeRows) {
      const values = [
        ...closeRows.map(row => row.核销关系),
        ...mappingRows.map(row => row.核销对象),
        ...findReconciliationsForAction(action, ruleRows, mappingRows).map(row => row.核销ID)
      ].filter(Boolean);
      return Array.from(new Set(values)).slice(0, 5).join("；") || "-";
    }
function formalSummary() {
      return state.voucherBatches.reduce((acc, batch) => {
        acc.debit += Number(batch.debit || 0);
        acc.credit += Number(batch.credit || 0);
        acc.control += Number(batch.controlAmount || 0);
        return acc;
      }, { debit: 0, credit: 0, control: 0, get balanced() { return Math.abs(this.debit - this.credit) < 0.01; } });
    }
    function reportBaseRows() {
      return accountingEntryRows().map(row => {
        const recon = reportReconciliationForEntry(row);
        const entityText = reportEntityText(row);
        const entityType = reportEntityTypesForText(entityText);
        const attribution = reportAttributionForEntry(row, entityText, entityType);
        const amount = Number(row.amount || row.debitAmount || row.creditAmount || row.controlChange || 0);
        return {
          _entryId: row.entryId,
          _voucherNo: row.voucherNo,
          日期: String(row.postedAt || "").slice(0, 10),
          入账时间: row.postedAt || "",
          凭证号: row.voucherNo,
          业务单号: row.sourceId,
          业务类型: row.bizName,
          站点ID: attribution.siteId,
          站点名称: attribution.siteName,
          发起主体类型: attribution.initiatorType,
          发起主体ID: attribution.initiatorId,
          发起主体名称: attribution.initiatorName,
          代理ID: attribution.agentId,
          代理名称: attribution.agentName,
          会员ID: attribution.memberId,
          会员名称: attribution.memberName,
          主体类型: attribution.initiatorType,
          主体名称: attribution.initiatorName,
          主体ID: attribution.initiatorId,
          科目编码: row.subjectCode,
          科目名称: row.subjectName,
          科目类型: row.subjectType || (row.entryKind === "信用台账" ? "信用台账" : ""),
          借贷方向: row.direction,
          金额: amount,
          借方金额: row.debitAmount,
          贷方金额: row.creditAmount,
          信用金额: row.controlChange,
          金额表达式: row.expression,
          分录类型: row.entryKind,
          核销状态: recon?.status || row.status || "未关联",
          后端落账状态: row.matrixCoverage || row.status || "",
          状态: row.status,
          核销键: row.reconciliationKey,
          备注: row.note || row.supplementNote,
          sourceTable: row.sourceTable,
          sourceDoc: row.sourceDoc,
          supplementLedger: row.supplementLedger,
          status: row.status,
          reconciliationKey: row.reconciliationKey,
          gapId: row.gapId,
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          subjectType: row.subjectType,
          direction: row.direction,
          amount,
          debitAmount: row.debitAmount,
          creditAmount: row.creditAmount,
          controlChange: row.controlChange,
          entryKind: row.entryKind,
          formal: row.formal
        };
      });
    }
    function reportRows(rows = filteredReportBaseRows("formal")) {
      const map = new Map();
      rows.forEach(row => {
        if (!row.formal || !row.subjectCode || String(row.subjectCode).startsWith("9")) return;
        const groupKey = [row.subjectCode, row.站点ID, row.发起主体类型, row.发起主体ID].join("|");
        const current = map.get(groupKey) || {
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          subjectType: row.subjectType,
          站点ID: row.站点ID,
          站点名称: row.站点名称,
          发起主体类型: row.发起主体类型,
          发起主体ID: row.发起主体ID,
          发起主体名称: row.发起主体名称,
          代理ID: row.代理ID,
          代理名称: row.代理名称,
          会员ID: row.会员ID,
          会员名称: row.会员名称,
          debit: 0,
          credit: 0,
          balance: 0,
          主体类型: new Set(),
          业务类型: new Set(),
          核销状态: new Set(),
          后端落账状态: new Set()
        };
        if (row.direction === "借") current.debit += Number(row.amount || 0);
        if (row.direction === "贷") current.credit += Number(row.amount || 0);
        current.balance = current.debit - current.credit;
        if (row.主体类型) current.主体类型.add(row.主体类型);
        if (row.业务类型) current.业务类型.add(row.业务类型);
        if (row.核销状态) current.核销状态.add(row.核销状态);
        if (row.后端落账状态) current.后端落账状态.add(row.后端落账状态);
        map.set(groupKey, current);
      });
      return Array.from(map.values()).map(row => ({
        ...row,
        主体类型: Array.from(row.主体类型).join("；"),
        业务类型: Array.from(row.业务类型).slice(0, 4).join("；"),
        核销状态: Array.from(row.核销状态).join("；"),
        后端落账状态: Array.from(row.后端落账状态).join("；")
      })).sort((a, b) => compare(a.subjectCode, b.subjectCode));
    }
    function subjectBalance(code) {
      const currentCode = currentSubjectCode(code);
      return reportRows()
        .filter(item => item.subjectCode === currentCode)
        .reduce((acc, item) => acc + Number(item.balance || 0), 0);
    }
    function controlReportRows(rows = filteredReportBaseRows("control")) {
      return rows
        .map(row => {
          const movement = controlMovement(row);
          return {
            凭证号: row.凭证号,
            业务单号: row.业务单号,
            业务类型: row.业务类型,
            站点ID: row.站点ID,
            站点名称: row.站点名称,
            发起主体类型: row.发起主体类型,
            发起主体ID: row.发起主体ID,
            发起主体名称: row.发起主体名称,
            代理ID: row.代理ID,
            代理名称: row.代理名称,
            会员ID: row.会员ID,
            会员名称: row.会员名称,
            主体类型: row.主体类型,
            主体名称: row.主体名称,
            主体ID: row.主体ID,
            subjectCode: row.subjectCode,
            subjectName: row.subjectName,
            subjectType: row.subjectType,
            direction: row.direction,
            increaseAmount: movement.increaseAmount,
            decreaseAmount: movement.decreaseAmount,
            netChange: movement.netChange,
            expression: row.金额表达式,
            核销状态: row.核销状态,
            后端落账状态: row.后端落账状态,
            note: row.备注
          };
        });
    }
    function controlMovement(line) {
      const amount = Number(line.amount || 0);
      const sign = controlDirectionSign(line.direction);
      const signedChange = sign === 0 ? 0 : amount * sign;
      return {
        increaseAmount: signedChange > 0 ? signedChange : 0,
        decreaseAmount: signedChange < 0 ? Math.abs(signedChange) : 0,
        netChange: signedChange
      };
    }
    function controlDirectionSign(direction) {
      const text = String(direction || "");
      if (/减少|解锁|扣减|冲减|退回|归零/.test(text)) return -1;
      if (/增加|锁定|冻结/.test(text)) return 1;
      return 0;
    }
    function filteredReportBaseRows(kind = "all") {
      return reportBaseRows().filter(row => {
        if (kind === "formal" && row.entryKind !== "正式分录") return false;
        if (kind === "control" && (row.entryKind !== "信用台账" || !String(row.subjectCode || "").startsWith("9"))) return false;
        return matchesReportFilters(row);
      });
    }
    function controlAccountSummaryRows(rows = filteredReportBaseRows("control")) {
      const map = new Map();
      rows.forEach(row => {
        const movement = controlMovement(row);
        const key = [row.subjectCode, row.站点ID, row.发起主体类型, row.发起主体ID].join("|");
        const current = map.get(key) || {
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          subjectType: row.subjectType || "信用类",
          控制账户说明: controlAccountNote(row.subjectCode),
          站点ID: row.站点ID,
          站点名称: row.站点名称,
          发起主体类型: row.发起主体类型,
          发起主体ID: row.发起主体ID,
          发起主体名称: row.发起主体名称,
          代理ID: row.代理ID,
          代理名称: row.代理名称,
          会员ID: row.会员ID,
          会员名称: row.会员名称,
          increaseAmount: 0,
          decreaseAmount: 0,
          netChange: 0,
          业务类型: new Set(),
          核销状态: new Set(),
          后端落账状态: new Set()
        };
        current.increaseAmount += Number(movement.increaseAmount || 0);
        current.decreaseAmount += Number(movement.decreaseAmount || 0);
        current.netChange += Number(movement.netChange || 0);
        if (row.业务类型) current.业务类型.add(row.业务类型);
        if (row.核销状态) current.核销状态.add(row.核销状态);
        if (row.后端落账状态) current.后端落账状态.add(row.后端落账状态);
        map.set(key, current);
      });
      return Array.from(map.values()).map(row => ({
        ...row,
        业务类型: Array.from(row.业务类型).slice(0, 4).join("；"),
        核销状态: Array.from(row.核销状态).join("；"),
        后端落账状态: Array.from(row.后端落账状态).join("；")
      })).sort((a, b) => compare(a.subjectCode, b.subjectCode) || compare(a.站点ID, b.站点ID) || compare(a.发起主体ID, b.发起主体ID));
    }
    function controlAccountNetByCode(code, rows = filteredReportBaseRows("control")) {
      const currentCode = currentSubjectCode(code);
      return controlAccountSummaryRows(rows)
        .filter(row => row.subjectCode === currentCode)
        .reduce((acc, row) => acc + Number(row.netChange || 0), 0);
    }
    function controlAccountNote(code) {
      const map = {
        "900101": "总站资金池额度，控制类账户，不进正式借贷平衡",
        "900102": "站点资金池额度，控制类账户，不进正式借贷平衡",
        "900103": "会员可提现/锁定信用，控制类账户",
        "900104": "场馆钱包信用，控制类账户"
      };
      return map[String(code || "")] || "控制类账户，不进正式借贷平衡";
    }
    function matchesReportFilters(row) {
      const day = String(row.日期 || row.入账时间 || "").slice(0, 10);
      if (ui.reportFrom && day && day < ui.reportFrom) return false;
      if (ui.reportTo && day && day > ui.reportTo) return false;
      if (ui.reportEntityTypeFilter && !String(row.主体类型 || "").includes(ui.reportEntityTypeFilter)) return false;
      if (ui.reportEntitySearch && !normalize([row.站点ID, row.站点名称, row.发起主体类型, row.发起主体ID, row.发起主体名称, row.主体ID, row.主体名称, row.主体类型, row.代理ID, row.代理名称, row.会员ID, row.会员名称, row.业务单号, row.业务类型, row.sourceTable, row.sourceDoc, row.supplementLedger, row.备注].join(" ")).includes(normalize(ui.reportEntitySearch))) return false;
      if (ui.reportSiteSearch && !normalize([row.站点ID, row.站点名称].join(" ")).includes(normalize(ui.reportSiteSearch))) return false;
      if (ui.reportInitiatorSearch && !normalize([row.发起主体类型, row.发起主体ID, row.发起主体名称, row.主体ID, row.主体名称, row.代理ID, row.代理名称, row.会员ID, row.会员名称].join(" ")).includes(normalize(ui.reportInitiatorSearch))) return false;
      if (ui.reportSubjectTypeFilter && row.subjectType !== ui.reportSubjectTypeFilter) return false;
      if (ui.reportSubjectSearch && !normalize([row.subjectCode, row.subjectName, row.科目编码, row.科目名称].join(" ")).includes(normalize(ui.reportSubjectSearch))) return false;
      if (ui.reportDirectionFilter && row.direction !== ui.reportDirectionFilter) return false;
      if (ui.reportBizTypeFilter && row.业务类型 !== ui.reportBizTypeFilter) return false;
      if (ui.reportReconStatusFilter && row.核销状态 !== ui.reportReconStatusFilter) return false;
      if (ui.reportBackendStatusFilter && row.后端落账状态 !== ui.reportBackendStatusFilter) return false;
      return true;
    }
    function currentReportRows() {
      if (ui.reportTab === "资产负债") return reportRows().filter(row => ["资产", "负债"].includes(row.subjectType));
      if (ui.reportTab === "收入成本") return reportRows().filter(row => ["收入", "成本"].includes(row.subjectType));
      if (isControlReportTab(ui.reportTab)) return controlAccountSummaryRows();
      return reportRows();
    }
    function currentReportDetailRows() {
      if (ui.reportTab === "资产负债") return filteredReportBaseRows("formal").filter(row => ["资产", "负债"].includes(row.subjectType));
      if (ui.reportTab === "收入成本") return filteredReportBaseRows("formal").filter(row => ["收入", "成本"].includes(row.subjectType));
      if (isControlReportTab(ui.reportTab)) return filteredReportBaseRows("control");
      return filteredReportBaseRows("formal");
    }
    function isControlReportTab(tab) {
      return tab === "信用/控制类账户" || tab === "信用台账";
    }
    function reportExportPayload() {
      return {
        报表: ui.reportTab,
        筛选条件: reportFilterLabels(),
        rows: currentReportRows(),
        明细行: currentReportDetailRows()
      };
    }
    function reportFilterLabels() {
      return {
        开始日期: ui.reportFrom || "全部",
        结束日期: ui.reportTo || "全部",
        发起主体类型: ui.reportEntityTypeFilter || "全部",
        站点搜索: ui.reportSiteSearch || "全部",
        发起主体搜索: ui.reportInitiatorSearch || ui.reportEntitySearch || "全部",
        科目类型: ui.reportSubjectTypeFilter || "全部",
        科目搜索: ui.reportSubjectSearch || "全部",
        借贷方向: ui.reportDirectionFilter || "全部",
        业务类型: ui.reportBizTypeFilter || "全部",
        核销状态: ui.reportReconStatusFilter || "全部",
        后端落账状态: ui.reportBackendStatusFilter || "全部"
      };
    }
    function uniqueReportValues(key, rows = reportBaseRows()) {
      return Array.from(new Set(rows.map(row => row[key]).filter(Boolean))).sort(compare);
    }
    function reportEntityText(row) {
      return [row.entity, row.bizName, row.sourceTable, row.sourceDoc, row.source, row.supplementLedger, row.subjectName, row.note, row.supplementNote].join(" ");
    }
    function reportEntityTypesForText(value) {
      const text = String(value || "");
      const pairs = [
        ["总站", /总站|官方|main|admin/i],
        ["站点", /站点|site|fund_pool|月结|预付/i],
        ["代理", /代理|agent|commission/i],
        ["会员", /会员|member|vip|红包|返水|活动|推广|投注|中奖|bonus|rebate/i],
        ["三方", /三方|通道|手续费|channel|fee|payment/i],
        ["场馆", /场馆|游戏|venue|game|wallet/i]
      ];
      const values = pairs.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
      return values.length ? values.join("/") : "系统";
    }
    function buildEntityAttribution(row = {}, entityText = "", entityType = "") {
      const text = `${entityText || ""} ${row.bizName || row.业务类型 || ""} ${row.subjectName || row.主体名称 || ""} ${row.entity || row.主体 || ""} ${row.note || row.备注 || ""} ${row.sourceTable || ""} ${row.sourceDoc || ""} ${row.supplementLedger || ""}`;
      const inferredType = reportInitiatorType(text, entityType);
      const directText = `${row.preferredType || row.主体类型 || row.subjectType || ""} ${row.bizName || row.业务类型 || ""} ${row.subjectName || row.主体名称 || ""} ${row.entity || row.主体 || ""}`;
      const primaryType = normalizePrimaryEntityType(row.preferredType || row.主体类型 || row.subjectType || inferredType, `${directText} ${text}`, inferredType);
      const sourceId = row.sourceId || row.业务单号 || row.源业务单号 || row.源单 || "";
      const voucherNo = row.voucherNo || row.凭证号 || "";
      const seed = `${sourceId}|${voucherNo}|${row.templateCode || row.模板编码 || ""}`;
      const siteNo = stableDemoNumber(`${seed}|站点`, 8);
      const agentNo = stableDemoNumber(`${seed}|代理`, 20);
      const memberNo = stableDemoNumber(`${seed}|会员`, 50);
      const channelNo = stableDemoNumber(`${seed}|三方`, 12);
      const venueNo = stableDemoNumber(`${seed}|场馆`, 12);
      const hasSite = primaryType !== "总站" && primaryType !== "系统";
      const hasAgent = primaryType === "代理" || primaryType === "会员" || /代理|佣金|推广/.test(directText);
      const hasMember = primaryType === "会员" || /会员充值|会员提现|会员余额|红包领取|VIP|返水|活动|投注|中奖|member/i.test(directText);
      const siteId = hasSite ? `SITE-${String(siteNo).padStart(3, "0")}` : primaryType === "总站" ? "MAIN-000" : "";
      const siteName = hasSite ? `演示站点${siteNo}` : primaryType === "总站" ? "总站" : "";
      const agentId = hasAgent ? `AGENT-${String(agentNo).padStart(3, "0")}` : "";
      const agentName = hasAgent ? `演示代理${agentNo}` : "";
      const memberId = hasMember ? `MEM-${String(memberNo).padStart(3, "0")}` : "";
      const memberName = hasMember ? `演示会员${memberNo}` : "";
      const subjectByType = {
        总站: { id: "MAIN-000", name: "总站" },
        站点: { id: siteId || "MAIN-000", name: siteName || "总站" },
        代理: { id: agentId, name: agentName },
        会员: { id: memberId, name: memberName },
        三方: { id: `CHN-${String(channelNo).padStart(3, "0")}`, name: `三方通道${channelNo}` },
        场馆: { id: `VEN-${String(venueNo).padStart(3, "0")}`, name: `演示场馆${venueNo}` },
        系统: { id: `SYS-${String(stableDemoNumber(`${seed}|系统`, 9)).padStart(3, "0")}`, name: "系统" }
      };
      const subject = subjectByType[primaryType] || subjectByType.系统;
      const result = {
        主体类型: primaryType,
        主体ID: subject.id,
        主体名称: subject.name,
        站点ID: siteId,
        站点名称: siteName,
        代理ID: agentId,
        代理名称: agentName,
        会员ID: memberId,
        会员名称: memberName
      };
      return {
        ...result,
        siteId: result.站点ID,
        siteName: result.站点名称,
        initiatorType: result.主体类型,
        initiatorId: result.主体ID,
        initiatorName: result.主体名称,
        agentId: result.代理ID,
        agentName: result.代理名称,
        memberId: result.会员ID,
        memberName: result.会员名称
      };
    }
    function normalizePrimaryEntityType(value, text = "", fallback = "系统") {
      const current = String(value || "");
      if (/代理提现|代理充值|代理佣金|代理转|佣金/.test(text)) return "代理";
      if (/会员充值|会员提现|红包领取|VIP|返水|活动|投注|中奖|主钱包|member/i.test(text)) return "会员";
      if (/站点充值|站点提现|站点转|站点月结|预付|Nexus|fund_pool|site/i.test(text)) return "站点";
      if (/总站|官方|main|admin/i.test(text)) return "总站";
      if (/三方|通道|手续费|channel|payment|fee/i.test(text)) return "三方";
      if (/场馆|游戏|venue|game|wallet/i.test(text)) return "场馆";
      if (current.includes("会员")) return "会员";
      if (current.includes("代理")) return "代理";
      if (current.includes("站点")) return "站点";
      if (current.includes("总站")) return "总站";
      if (current.includes("三方")) return "三方";
      if (current.includes("场馆")) return "场馆";
      return fallback || "系统";
    }
    function reportAttributionForEntry(row, entityText, entityType) {
      return buildEntityAttribution(row, entityText, entityType);
    }
    function reportAttributionForCloseLoop(row) {
      const text = JSON.stringify(row || {});
      const entityType = reportEntityTypesForText(text);
      const attribution = reportAttributionForEntry({
        sourceId: row.源单 || row.缺口编号 || "",
        voucherNo: row.凭证号 || "",
        bizName: row.闭环主题 || "",
        subjectName: row.报表科目 || "",
        note: row.下一步动作 || ""
      }, text, entityType);
      return {
        站点ID: attribution.siteId,
        站点名称: attribution.siteName,
        发起主体类型: attribution.initiatorType,
        发起主体ID: attribution.initiatorId,
        发起主体名称: attribution.initiatorName,
        主体类型: attribution.initiatorType,
        主体ID: attribution.initiatorId,
        主体名称: attribution.initiatorName,
        代理ID: attribution.agentId,
        代理名称: attribution.agentName,
        会员ID: attribution.memberId,
        会员名称: attribution.memberName
      };
    }
    function reportInitiatorType(text, entityType) {
      if (/代理提现|代理充值|代理佣金|代理转|佣金/.test(text)) return "代理";
      if (/会员充值|会员提现|会员余额|VIP|返水|活动|推广|红包领取|投注|中奖|主钱包|member/i.test(text)) return "会员";
      if (/总站|官方|main|admin/i.test(text)) return "总站";
      if (/站点充值|站点提现|站点转|站点月结|预付|Nexus|fund_pool|site/i.test(text)) return "站点";
      if (/三方|通道|手续费|channel|payment|fee/i.test(text)) return "三方";
      if (/场馆|游戏|venue|game|wallet/i.test(text)) return "场馆";
      if (String(entityType || "").includes("代理")) return "代理";
      if (String(entityType || "").includes("会员")) return "会员";
      if (String(entityType || "").includes("站点")) return "站点";
      return "系统";
    }
    function stableDemoNumber(value, max) {
      const text = String(value || "demo");
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
      return (hash % max) + 1;
    }
    function reportReconciliationForEntry(row) {
      const key = String(row.reconciliationKey || "");
      return (state.reconciliationRecords || []).find(item => {
        if (row.voucherNo && item.voucherNo === row.voucherNo) return true;
        if (row.sourceId && item.sourceId === row.sourceId) return true;
        const itemKey = String(item.reconciliationKey || item.ruleId || item.id || "");
        return key && itemKey && (key.includes(itemKey) || itemKey.includes(key));
      }) || null;
    }
    function groupBy(rows, key) {
      return rows.reduce((acc, row) => {
        const value = row[key] || "";
        (acc[value] ||= []).push(row);
        return acc;
      }, {});
    }
    function sum(rows, key) {
      return rows.reduce((acc, row) => acc + Number(row[key] || 0), 0);
    }
    function compare(a, b) {
      const an = Number(a);
      const bn = Number(b);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return String(a ?? "").localeCompare(String(b ?? ""), "zh-Hans-CN");
    }
    function normalize(value) {
      return String(value || "").toLowerCase().replace(/\s+/g, "");
    }
    function fmtMoney(value) {
      return Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
    function escapeAttr(value) {
      return escapeHtml(value).replace(/`/g, "&#96;");
    }
    function downloadJson(name, payload) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    function toast(message) {
      const el = $("#toast");
      el.textContent = message;
      el.classList.add("open");
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => el.classList.remove("open"), 1800);
    }
    function openDrawer(title, body) {
      $("#drawerTitle").textContent = title;
      $("#drawerBody").innerHTML = body;
      $("#drawerBody").scrollTop = 0;
      $("#drawer").classList.add("open");
      $("#drawer").setAttribute("aria-hidden", "false");
      $("#drawerBackdrop").classList.add("open");
    }
    function closeDrawer() {
      $("#drawer").classList.remove("open");
      $("#drawer").setAttribute("aria-hidden", "true");
      $("#drawerBackdrop").classList.remove("open");
    }
    function findConfigRow(sheet, key) {
      if (sheet === "闭环总控") return closedLoopControlRows().find(row => rowKey(row) === key);
      const rows = typeof configSheetRows === "function" ? configSheetRows(sheet) : (excel[sheet] || []);
      return (rows || []).find(row => rowKey(row) === key);
    }

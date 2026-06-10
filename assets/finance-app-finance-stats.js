"use strict";

    function financeStatRows(tab) {
      if (tab === "统计总览") return financeStatOverviewRows();
      return filterFinanceStatRows(rawFinanceStatRows(tab));
    }

    function rawFinanceStatRows(tab) {
      if (tab === "信用台账余额") return reportBaseRows().filter(row => row.entryKind === "信用台账" && String(row.subjectCode || "").startsWith("9")).map(row => ({
        日期: row.日期,
        凭证号: row.凭证号,
        _voucherNo: row._voucherNo,
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
        主体: row.主体名称,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        subjectType: row.subjectType || "信用台账",
        科目类型: row.subjectType || "信用台账",
        方向: row.direction,
        金额: Number(row.amount || row.controlChange || 0),
        净变动: controlMovement(row).netChange,
        状态: "信用台账",
        核销键: row.核销键,
        备注: row.备注
      }));
      const profile = financeStatProfile(tab);
      const entryRows = reportBaseRows()
        .filter(row => profile.codes.some(code => String(row.subjectCode || "").startsWith(code)) || profile.match.test(JSON.stringify(row)))
        .map(row => ({
          日期: row.日期,
          凭证号: row.凭证号,
          _voucherNo: row._voucherNo,
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
          主体: row.主体名称,
          统计模块: tab,
          科目编码: row.subjectCode,
          科目名称: row.subjectName,
          科目类型: row.subjectType,
          subjectType: row.subjectType,
          方向: row.direction,
          金额: Number(row.amount || 0),
          借方金额: row.debitAmount,
          贷方金额: row.creditAmount,
          状态: row.status,
          核销键: row.reconciliationKey,
          缺口编号: row.gapId,
          备注: row.note || row.supplementNote
        }));
      return [...entryRows, ...closeLoopFinanceStatRows(tab, profile)];
    }

    function closeLoopFinanceStatRows(tab, profile) {
      return closedLoopControlRows()
        .filter(row => profile.match.test(JSON.stringify(row)) || String(row.报表科目 || "").split(/[；;，,、]/).some(item => profile.codes.some(code => item.trim().startsWith(code))))
        .map(row => ({
          ...reportAttributionForCloseLoop(row),
          日期: now(-Number(row.账龄小时 || 0) * 60).slice(0, 10),
          凭证号: row.凭证号,
          _voucherNo: row.凭证号,
          业务单号: row.源单,
          业务类型: row.闭环主题,
          主体类型: reportEntityTypesForText(JSON.stringify(row)),
          主体: row.责任模块,
          统计模块: tab,
          科目编码: row.报表科目,
          科目名称: row.闭环主题,
          科目类型: subjectTypeForReportSubject(row.报表科目),
          subjectType: subjectTypeForReportSubject(row.报表科目),
          方向: /出款|付款|减少|应付/.test(`${row.闭环主题} ${row.结账影响}`) ? "减少/核销" : "增加/确认",
          金额: Number(row.金额 || 0),
          借方金额: "",
          贷方金额: "",
          状态: row.核销状态,
          核销键: row.核销关系,
          缺口编号: row.缺口编号,
          闭环状态: row.闭环状态,
          后端落地状态: row.后端落地状态,
          备注: row.下一步动作
        }));
    }

    function financeStatProfile(tab) {
      const map = {
        "官方账户收支": { codes: ["100101", "100102"], match: /官方|official_account|收款|出款/ },
        "三方清算": { codes: ["100201", "100203", "200701", "500101"], match: /三方|手续费|fee_clearance|channel_clearance/ },
        "提现待付": { codes: ["200102"], match: /提现待付|withdraw_payable/ },
        "红包待领": { codes: ["200501", "500205"], match: /红包|red_packet/ },
        "奖励成本": { codes: ["500201", "500202", "500203", "500204", "500207"], match: /奖励|福利|返水|推广|调额|reward|bonus|rebate/ },
        "月结应收": { codes: ["100501", "400401"], match: /月结|site_monthly|settlement/ },
        "场馆费应付": { codes: ["200801", "500401"], match: /场馆费|venue_fee/ },
        "游戏结算": { codes: ["100202", "200601", "400202", "500301"], match: /游戏|投注|派奖|场馆钱包|game|venue_wallet/ }
      };
      return map[tab] || { codes: [], match: /$a/ };
    }

    function financeStatOverviewRows() {
      return financeStatTabs.filter(tab => tab !== "统计总览").map(tab => {
        const rows = filterFinanceStatRows(rawFinanceStatRows(tab));
        return {
          统计模块: tab,
          行数: rows.length,
          金额: sum(rows, "金额"),
          净变动: sum(rows, "净变动"),
          待处理: rows.filter(row => /待|差异|异常|未/.test(JSON.stringify(row))).length,
          主要科目: Array.from(new Set(rows.map(row => row.科目名称 || row.subjectName).filter(Boolean))).slice(0, 4).join("；"),
          口径: tab === "信用台账余额" ? "只进信用台账，不进正式借贷" : "正式分录统计，按演示凭证汇总"
        };
      });
    }

    function voucherDate(voucherNo) {
      const batch = state.voucherBatches.find(row => row.voucherNo === voucherNo);
      return batch?.postedAt || "";
    }

    function financeStatRangeText() {
      if (ui.financeStatFrom || ui.financeStatTo) return `${ui.financeStatFrom || "开始"} 至 ${ui.financeStatTo || "结束"}`;
      return "全部期间";
    }

    function preferredFinanceStatColumns(tab, rows) {
      if (tab === "统计总览") return ["统计模块", "行数", "金额", "净变动", "待处理", "主要科目", "口径"];
      if (tab === "信用台账余额") return ["日期", "凭证号", "业务单号", "业务类型", "站点ID", "站点名称", "发起主体类型", "发起主体ID", "发起主体名称", "代理ID", "代理名称", "会员ID", "会员名称", "subjectCode", "subjectName", "方向", "金额", "净变动", "状态", "备注"];
      return ["日期", "凭证号", "业务单号", "业务类型", "站点ID", "站点名称", "发起主体类型", "发起主体ID", "发起主体名称", "代理ID", "代理名称", "会员ID", "会员名称", "统计模块", "科目编码", "科目名称", "科目类型", "方向", "金额", "借方金额", "贷方金额", "状态", "核销键", "缺口编号", "闭环状态", "后端落地状态"];
    }

    function filterFinanceStatRows(rows) {
      return rows.filter(row => {
        const day = String(row.日期 || row.postedAt || row.updatedAt || "").slice(0, 10);
        if (ui.financeStatFrom && day && day < ui.financeStatFrom) return false;
        if (ui.financeStatTo && day && day > ui.financeStatTo) return false;
        if (ui.financeStatSubject && !normalize(JSON.stringify(row)).includes(normalize(ui.financeStatSubject))) return false;
        if (ui.financeStatEntityTypeFilter && !String(row.发起主体类型 || row.主体类型 || "").includes(ui.financeStatEntityTypeFilter)) return false;
        if (ui.financeStatSiteSearch && !normalize([row.站点ID, row.站点名称].join(" ")).includes(normalize(ui.financeStatSiteSearch))) return false;
        if (ui.financeStatInitiatorSearch && !normalize([row.发起主体类型, row.发起主体ID, row.发起主体名称, row.主体, row.代理ID, row.代理名称, row.会员ID, row.会员名称].join(" ")).includes(normalize(ui.financeStatInitiatorSearch))) return false;
        if (ui.financeStatBizTypeFilter && row.业务类型 !== ui.financeStatBizTypeFilter) return false;
        if (ui.financeStatSubjectTypeFilter && (row.科目类型 || row.subjectType) !== ui.financeStatSubjectTypeFilter) return false;
        if (ui.financeStatStatusFilter && row.状态 !== ui.financeStatStatusFilter) return false;
        return true;
      });
    }

    function financeStatFilterValues(key, tab = ui.financeStatTab) {
      const rows = tab === "统计总览" ? financeStatTabs.filter(item => item !== "统计总览").flatMap(item => rawFinanceStatRows(item)) : rawFinanceStatRows(tab);
      return Array.from(new Set(rows.map(row => row[key]).filter(Boolean))).sort(compare);
    }

    function financeStatExportPayload() {
      return {
        统计页签: ui.financeStatTab,
        筛选条件: {
          开始日期: ui.financeStatFrom || "全部",
          结束日期: ui.financeStatTo || "全部",
          发起主体类型: ui.financeStatEntityTypeFilter || "全部",
          站点搜索: ui.financeStatSiteSearch || "全部",
          发起主体搜索: ui.financeStatInitiatorSearch || "全部",
          主体搜索: ui.financeStatSubject || "全部",
          业务类型: ui.financeStatBizTypeFilter || "全部",
          科目类型: ui.financeStatSubjectTypeFilter || "全部",
          状态: ui.financeStatStatusFilter || "全部"
        },
        rows: financeStatRows(ui.financeStatTab)
      };
    }

    function subjectTypeForReportSubject(value) {
      const code = (String(value || "").match(/[1-9]\d{5}/) || [])[0] || "";
      if (!code) return "";
      return subjectInfoByCode(code).科目类型 || "";
    }

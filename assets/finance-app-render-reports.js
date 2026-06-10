"use strict";

function renderReports() {
  if (ui.reportTab === "信用台账") ui.reportTab = "信用/控制类账户";
  const tabs = ["资产负债", "收入成本", "信用/控制类账户"];
  return `
    ${renderPageHead("财务报表", "正式分录和信用台账分开汇总，fund_pool_balance 不进入资产负债表。", `
      <button class="btn" data-action="export-view">导出当前筛选报表</button>
    `)}
    ${renderReportFilters()}
    ${renderTabs(tabs, ui.reportTab, "report-tab")}
    ${ui.reportTab === "资产负债" ? renderBalanceReport() : ""}
    ${ui.reportTab === "收入成本" ? renderIncomeCostReport() : ""}
    ${isControlReportTab(ui.reportTab) ? renderControlReport() : ""}
  `;
}

function renderReportFilters() {
  const rows = reportBaseRows();
  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">报表字段筛选</h2>
          <span class="panel-meta">筛选先作用于凭证/分录明细，再重新汇总当前报表。</span>
        </div>
        <button class="btn" data-action="clear-report-filters">清空筛选</button>
      </div>
      <div class="panel-body filter-grid">
        <div class="field"><label>开始日期</label><input id="reportFrom" type="date" value="${escapeAttr(ui.reportFrom)}"></div>
        <div class="field"><label>结束日期</label><input id="reportTo" type="date" value="${escapeAttr(ui.reportTo)}"></div>
        ${renderReportSelect("reportEntityTypeFilter", "发起主体类型", ui.reportEntityTypeFilter, ["总站", "站点", "代理", "会员", "三方", "场馆", "系统"])}
        <div class="field"><label>站点搜索</label><input id="reportSiteSearch" type="search" value="${escapeAttr(ui.reportSiteSearch)}" placeholder="站点ID或站点名称"></div>
        <div class="field"><label>发起主体搜索</label><input id="reportInitiatorSearch" type="search" value="${escapeAttr(ui.reportInitiatorSearch || ui.reportEntitySearch)}" placeholder="站点、代理、会员的ID或名称"></div>
        ${renderReportSelect("reportSubjectTypeFilter", "科目类型", ui.reportSubjectTypeFilter, uniqueReportValues("科目类型", rows))}
        <div class="field"><label>科目编码/名称</label><input id="reportSubjectSearch" type="search" value="${escapeAttr(ui.reportSubjectSearch)}" placeholder="例如 200101 或 会员余额"></div>
        ${renderReportSelect("reportDirectionFilter", "借贷方向", ui.reportDirectionFilter, uniqueReportValues("借贷方向", rows))}
        ${renderReportSelect("reportBizTypeFilter", "业务类型", ui.reportBizTypeFilter, uniqueReportValues("业务类型", rows))}
        ${renderReportSelect("reportReconStatusFilter", "核销状态", ui.reportReconStatusFilter, uniqueReportValues("核销状态", rows))}
        ${renderReportSelect("reportBackendStatusFilter", "后端落账状态", ui.reportBackendStatusFilter, uniqueReportValues("后端落账状态", rows))}
      </div>
    </div>
  `;
}

function renderReportSelect(id, label, value, options) {
  const finalOptions = Array.from(new Set((options || []).filter(Boolean)));
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <select id="${escapeAttr(id)}">
        <option value="">全部</option>
        ${finalOptions.map(option => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderBalanceReport() {
  const rows = reportRows().filter(row => ["资产", "负债"].includes(row.subjectType));
  const assets = sum(rows.filter(row => row.subjectType === "资产"), "balance");
  const liabilities = sum(rows.filter(row => row.subjectType === "负债"), "balance");
  return `
    <div class="metrics">
      ${metric("资产合计", fmtMoney(assets), "只含正式资产科目", "info")}
      ${metric("负债合计", fmtMoney(liabilities), "只含正式负债科目", "warn")}
      ${metric("净额", fmtMoney(assets - liabilities), "演示种子数据", "good")}
      ${metric("信用类排除", "900xxx", "独立台账", "info")}
      ${metric("官方账户", fmtMoney(subjectBalance("100101") + subjectBalance("100102")), "收款/出款", "info")}
      ${metric("手续费清算", fmtMoney(subjectBalance("200701")), "默认不进收入", "warn")}
      ${metric("提现待付", fmtMoney(subjectBalance("200102")), "申请/出款/失败三段", "warn")}
      ${metric("红包待领", fmtMoney(subjectBalance("200501")), "发放/领取/退回", "warn")}
      ${metric("月结应收", fmtMoney(subjectBalance("100501")), "现金收款再核销", "info")}
    </div>
    <div class="panel">
      <div class="panel-head"><h2 class="panel-title">资产负债科目余额</h2></div>
      ${renderTable({ id: "report-balance", rows, columns: ["站点ID","站点名称","发起主体类型","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","subjectCode","subjectName","subjectType","业务类型","debit","credit","balance","核销状态","后端落账状态"], actions: null })}
    </div>
  `;
}

function renderIncomeCostReport() {
  const rows = reportRows().filter(row => ["收入", "成本"].includes(row.subjectType));
  const income = sum(rows.filter(row => row.subjectType === "收入"), "balance");
  const cost = sum(rows.filter(row => row.subjectType === "成本"), "balance");
  return `
    <div class="metrics">
      ${metric("收入", fmtMoney(income), "分润/月租/游戏净收入等", "good")}
      ${metric("成本", fmtMoney(cost), "福利/返水/活动/推广/场馆费", "bad")}
      ${metric("利润口径", fmtMoney(income - cost), "演示口径", "info")}
      ${metric("手续费收入", fmtMoney(subjectBalance("400101")), "仅平台承担时启用", "warn")}
      ${metric("奖励成本", fmtMoney(subjectBalance("500201") + subjectBalance("500202") + subjectBalance("500203") + subjectBalance("500204")), "来源凭证防重复", "bad")}
      ${metric("场馆/游戏", fmtMoney(subjectBalance("500301") + subjectBalance("500401")), "结算批次核销", "bad")}
    </div>
    <div class="panel">
      <div class="panel-head"><h2 class="panel-title">收入成本科目余额</h2></div>
      ${renderTable({ id: "report-income-cost", rows, columns: ["站点ID","站点名称","发起主体类型","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","subjectCode","subjectName","subjectType","业务类型","debit","credit","balance","核销状态","后端落账状态"], actions: null })}
    </div>
  `;
}

function renderControlReport() {
  const rows = controlReportRows();
  const summaryRows = controlAccountSummaryRows();
  const increase = sum(rows, "increaseAmount");
  const decrease = sum(rows, "decreaseAmount");
  const netChange = sum(rows, "netChange");
  return `
    <div class="metrics">
      ${metric("总站资金池额度", fmtMoney(controlAccountNetByCode("900101")), "900101 控制类账户", "info")}
      ${metric("站点资金池额度", fmtMoney(controlAccountNetByCode("900102")), "900102 控制类账户", "info")}
      ${metric("会员锁定信用", fmtMoney(controlAccountNetByCode("900103")), "900103 可提现/锁定", "warn")}
      ${metric("场馆钱包信用", fmtMoney(controlAccountNetByCode("900104")), "900104 场馆钱包", "warn")}
      ${metric("台账增加", fmtMoney(increase), "信用增加/锁定", "info")}
      ${metric("台账减少", fmtMoney(decrease), "信用减少/解锁", "warn")}
      ${metric("净变动", fmtMoney(netChange), "增加 - 减少，不进借贷平衡", "good")}
      ${metric("入账口径", "不进正式借贷", "900xxx / fund_pool_balance", "warn")}
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">控制类账户汇总</h2>
          <span class="panel-meta">按控制科目、站点和发起主体汇总，单列复核，不进入资产负债表。</span>
        </div>
      </div>
      ${renderTable({ id: "report-control-summary", rows: summaryRows, columns: ["站点ID","站点名称","发起主体类型","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","subjectCode","subjectName","subjectType","控制账户说明","业务类型","increaseAmount","decreaseAmount","netChange","核销状态","后端落账状态"], actions: null })}
    </div>
    <div class="panel">
      <div class="panel-head"><h2 class="panel-title">信用台账明细</h2></div>
      ${renderTable({ id: "report-control", rows, columns: ["凭证号","业务单号","业务类型","站点ID","站点名称","发起主体类型","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","subjectCode","subjectName","subjectType","direction","increaseAmount","decreaseAmount","netChange","expression","核销状态","后端落账状态","note"], actions: null })}
    </div>
  `;
}

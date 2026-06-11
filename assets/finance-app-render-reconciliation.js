"use strict";

function reconciliationDisplayRows() {
      return (state.reconciliationRecords || []).map((row, index) => {
        const voucher = (state.voucherBatches || []).find(batch => batch.voucherNo === row.voucherNo) || closeLoopRowVoucher({ 凭证规则: row.reconciliationKey, 关联模板: row.reconciliationKey }) || {};
        const attribution = buildEntityAttribution({
          sourceId: row.sourceId || voucher.sourceId || "",
          voucherNo: row.voucherNo || voucher.voucherNo || "",
          bizName: row.object || row.closeLoopName || voucher.bizName || "",
          entity: row.object || row.closeLoopName || "",
          sourceTable: row.sourceTable || voucher.sourceTable || "",
          sourceDoc: row.sourceDoc || voucher.sourceDoc || "",
          supplementLedger: row.supplementLedger || voucher.supplementLedger || "",
          note: `${row.standard || ""} ${row.nextAction || ""} ${row.closeImpact || ""}`
        }, JSON.stringify({ row, voucher }));
        return {
          _id: row.id,
          _voucherNo: row.voucherNo || voucher.voucherNo || "",
          更新时间: row.updatedAt || "",
          核销对象: row.object || row.closeLoopName || row.ruleId || "",
          业务单号: row.sourceId || voucher.sourceId || "",
          站点ID: attribution.站点ID,
          站点名称: attribution.站点名称,
          发起主体身份: attribution.initiatorType,
          发起主体ID: attribution.initiatorId,
          发起主体名称: attribution.initiatorName,
          代理ID: attribution.代理ID,
          代理名称: attribution.代理名称,
          会员ID: attribution.会员ID,
          会员名称: attribution.会员名称,
          来源单据: row.sourceDoc || row.sourceTable || "",
          核销关系: row.reconciliationKey || row.ruleId || "",
          金额: Number(row.amount || 0),
          差异: Number(row.diff || 0),
          核销状态: row.status || "",
          凭证号: row.voucherNo || voucher.voucherNo || "",
          关联账本: row.supplementLedger || "",
          后端落账状态: row.backendStatus || row.supplementNote || "按核销记录复核",
          财务处理建议: row.nextAction || row.standard || row.closeImpact || "核对源单、凭证、账本和核销关系"
        };
      });
    }

    function filterReconciliationRows(rows) {
      return (rows || []).filter(row => {
        if (ui.reconciliationObjectFilter && row.核销对象 !== ui.reconciliationObjectFilter) return false;
        if (ui.reconciliationSourceDocFilter && row.来源单据 !== ui.reconciliationSourceDocFilter) return false;
        if (ui.reconciliationInitiatorTypeFilter && row.发起主体身份 !== ui.reconciliationInitiatorTypeFilter) return false;
        if (!rowMatchesEntityOption(row, "站点ID", "站点名称", ui.reconciliationSiteFilter)) return false;
        if (!rowMatchesEntityOption(row, "发起主体ID", "发起主体名称", ui.reconciliationInitiatorFilter)) return false;
        if (ui.reconciliationRelationFilter && row.核销关系 !== ui.reconciliationRelationFilter) return false;
        if (ui.reconciliationStatusFilter && row.核销状态 !== ui.reconciliationStatusFilter) return false;
        if (ui.reconciliationVoucherFilter && row.凭证号 !== ui.reconciliationVoucherFilter) return false;
        if (ui.reconciliationLedgerFilter && row.关联账本 !== ui.reconciliationLedgerFilter) return false;
        if (ui.reconciliationBackendFilter && row.后端落账状态 !== ui.reconciliationBackendFilter) return false;
        return true;
      });
    }

    function currentReconciliationRows() {
      return filteredRows(filterReconciliationRows(reconciliationDisplayRows()));
    }

    function reconciliationFilterLabels() {
      return {
        核销对象: ui.reconciliationObjectFilter || "全部",
        来源单据: ui.reconciliationSourceDocFilter || "全部",
        站点: ui.reconciliationSiteFilter || "全部",
        发起主体身份: ui.reconciliationInitiatorTypeFilter || "全部",
        发起主体: ui.reconciliationInitiatorFilter || "全部",
        核销关系: ui.reconciliationRelationFilter || "全部",
        核销状态: ui.reconciliationStatusFilter || "全部",
        凭证号: ui.reconciliationVoucherFilter || "全部",
        关联账本: ui.reconciliationLedgerFilter || "全部",
        后端落账状态: ui.reconciliationBackendFilter || "全部"
      };
    }

    function renderReconciliationFilters(sourceRows) {
      return `
        <div class="panel">
          <div class="panel-head">
            <div><h2 class="panel-title">核销筛选</h2><span class="panel-meta">按源单、主体、核销关系、凭证和账本过滤。</span></div>
            <button class="btn" data-action="clear-reconciliation-filters">清空筛选</button>
          </div>
          <div class="panel-body filter-grid">
            ${renderReportSelect("reconciliationObjectFilter", "核销对象", ui.reconciliationObjectFilter, uniqueRowValues(sourceRows, "核销对象"))}
            ${renderReportSelect("reconciliationSourceDocFilter", "来源单据", ui.reconciliationSourceDocFilter, uniqueRowValues(sourceRows, "来源单据"))}
            ${renderReportSelect("reconciliationSiteFilter", "站点", ui.reconciliationSiteFilter, uniqueEntityOptions(sourceRows, "站点ID", "站点名称"))}
            ${renderReportSelect("reconciliationInitiatorTypeFilter", "发起主体身份", ui.reconciliationInitiatorTypeFilter, uniqueRowValues(sourceRows, "发起主体身份"))}
            ${renderReportSelect("reconciliationInitiatorFilter", "发起主体", ui.reconciliationInitiatorFilter, uniqueEntityOptions(sourceRows, "发起主体ID", "发起主体名称"))}
            ${renderReportSelect("reconciliationRelationFilter", "核销关系", ui.reconciliationRelationFilter, uniqueRowValues(sourceRows, "核销关系"))}
            ${renderReportSelect("reconciliationStatusFilter", "核销状态", ui.reconciliationStatusFilter, uniqueRowValues(sourceRows, "核销状态"))}
            ${renderReportSelect("reconciliationVoucherFilter", "凭证号", ui.reconciliationVoucherFilter, uniqueRowValues(sourceRows, "凭证号"))}
            ${renderReportSelect("reconciliationLedgerFilter", "关联账本", ui.reconciliationLedgerFilter, uniqueRowValues(sourceRows, "关联账本"))}
            ${renderReportSelect("reconciliationBackendFilter", "后端落账状态", ui.reconciliationBackendFilter, uniqueRowValues(sourceRows, "后端落账状态"))}
          </div>
        </div>
      `;
    }

    function renderReconciliation() {
      const sourceRows = reconciliationDisplayRows();
      const rows = filteredRows(filterReconciliationRows(sourceRows));
      const diff = sum(rows, "差异");
      const pending = rows.filter(row => /待|差异|部分|需确认|复核/.test(`${row.核销状态} ${row.后端落账状态}`)).length;
      const linked = rows.filter(row => row.凭证号 && row.关联账本).length;
      return `
        ${renderPageHead("核销对账", "证明每笔账已经从业务源单、官方账户、三方清算、账本和凭证之间对上。", `
          <button class="btn" data-action="export-view">导出核销对账</button>
        `)}
        <div class="metrics">
          ${metric("核销记录", rows.length, "当前筛选", "info")}
          ${metric("已串凭证账本", linked, "凭证和账本可追踪", "good")}
          ${metric("待处理/差异", pending, "待核销、差异或需确认", pending ? "warn" : "good")}
          ${metric("差异金额", fmtMoney(diff), "按当前筛选", Math.abs(diff) > 0.01 ? "bad" : "good")}
        </div>
        ${renderReconciliationFilters(sourceRows)}
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">源单、账本、凭证核销关系</h2>
              <span class="panel-meta">充值、提现、红包、奖励、佣金、月结、场馆费和游戏结算都必须能核销。</span>
            </div>
            <span class="badge blue">关账依据</span>
          </div>
          ${renderTable({
            id: "reconciliation-ledger",
            rows,
            columns: ["更新时间","核销对象","业务单号","站点ID","站点名称","发起主体身份","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","来源单据","核销关系","金额","差异","核销状态","凭证号","关联账本","后端落账状态","财务处理建议"],
            actions: row => `
              <button class="btn sm" data-action="detail-reconciliation" data-id="${escapeAttr(row._id)}">详情</button>
              ${row._voucherNo ? `<button class="btn sm" data-action="detail-voucher" data-id="${escapeAttr(row._voucherNo)}">凭证</button>` : ""}
            `
          })}
        </div>
      `;
    }

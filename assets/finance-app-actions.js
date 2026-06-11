"use strict";

    function ledgerDefinitionForRecord(row) {
      return state.ledgerDefinitions.find(def => def.模块 === row?.ledgerModule || def.建议表名 === row?.tableName) || state.ledgerDefinitions[0] || {};
    }

    function showEditSubjectCode(id) {
      const row = state.subjects.find(item => item.subjectId === id);
      if (!row) return;
      openDrawer("修改科目编码", `
        <div class="locked-note">科目名称为锁定字段，只能调整科目编码；保存时不会读取或修改科目名称。生产环境还需要启用日期、停用日期、审批记录和锁账限制，本原型只做演示状态维护。</div>
        <div class="filter-grid">
          <div class="field"><label>科目名称（锁定）</label><input value="${escapeAttr(row.科目名称 || "")}" readonly></div>
          <div class="field"><label>科目类型（只读）</label><input value="${escapeAttr(row.科目类型 || "")}" readonly></div>
          <div class="field"><label>原始科目编码（只读）</label><input value="${escapeAttr(row.原始科目编码 || "")}" readonly></div>
          <div class="field"><label>当前科目编码</label><input id="editSubjectCode" inputmode="numeric" maxlength="6" value="${escapeAttr(row.科目编码 || "")}"></div>
        </div>
        <div class="action-bar">
          <button class="btn primary" data-action="save-subject-code" data-id="${escapeAttr(id)}">保存编码</button>
          <button class="btn" data-action="close-drawer">取消</button>
        </div>
      `);
    }

    function saveSubjectCode(id) {
      const row = state.subjects.find(item => item.subjectId === id);
      const input = $("#editSubjectCode");
      if (!row || !input) return;
      const nextCode = String(input.value || "").trim();
      if (!/^[1-9]\d{5}$/.test(nextCode)) {
        toast("科目编码需为 6 位数字");
        return;
      }
      const duplicated = state.subjects.find(item => item.subjectId !== id && String(item.科目编码) === nextCode);
      if (duplicated) {
        toast(`编码已被「${duplicated.科目名称}」使用`);
        return;
      }
      const oldCode = String(row.科目编码 || "");
      const lockedName = row.科目名称 || "";
      row.科目编码 = nextCode;
      row.编码状态 = nextCode === row.原始科目编码 ? "原始" : "已调整";
      row.编码更新时间 = now();
      const touchedLines = syncSubjectCodeToVoucherLines(row, oldCode, nextCode);
      state.auditTrail.unshift({ time: now(), actor: "财务配置", action: "修改科目编码", target: lockedName, result: `${oldCode} -> ${nextCode}，名称未修改，联动 ${touchedLines} 行` });
      saveState();
      closeDrawer();
      render();
      toast("科目编码已保存，科目名称未变");
    }

    function syncSubjectCodeToVoucherLines(subject, oldCode, nextCode) {
      const knownCodes = new Set([String(oldCode || ""), String(subject.原始科目编码 || ""), String(nextCode || "")].filter(Boolean));
      let touched = 0;
      state.voucherBatches.forEach(batch => {
        (batch.lines || []).forEach(line => {
          const sameLockedName = line.subjectName === subject.科目名称;
          const sameKnownCode = knownCodes.has(String(line.subjectCode || ""));
          if (!sameLockedName || !sameKnownCode) return;
          line.subjectCode = nextCode;
          line.subjectName = subject.科目名称;
          line.subjectType = subject.科目类型 || line.subjectType;
          touched += 1;
        });
        const amounts = summarizeLines(batch.lines || []);
        batch.debit = amounts.debit;
        batch.credit = amounts.credit;
        batch.controlAmount = amounts.control;
        batch.balanced = Math.abs(amounts.debit - amounts.credit) < 0.01;
      });
      return touched;
    }

    function applyLedgerBoardQuick(range) {
      const selected = ledgerBoardQuickRange(range);
      ui.ledgerBoardFrom = selected.from;
      ui.ledgerBoardTo = selected.to;
      ui.ledgerBoardQuick = range || "";
      render();
    }

    function ledgerBoardQuickRange(range) {
      const today = new Date();
      const fromOffset = days => {
        const date = new Date(today);
        date.setDate(date.getDate() - days);
        return date;
      };
      if (range === "3d") return { from: formatDateInput(fromOffset(2)), to: formatDateInput(today) };
      if (range === "7d") return { from: formatDateInput(fromOffset(6)), to: formatDateInput(today) };
      if (range === "1m") return { from: formatDateInput(fromOffset(29)), to: formatDateInput(today) };
      if (range === "last-month") {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: formatDateInput(first), to: formatDateInput(last) };
      }
      return { from: formatDateInput(today), to: formatDateInput(today) };
    }

    function formatDateInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function requestLedgerReversal(id) {
      const row = state.ledgerRecords.find(item => item.id === id);
      if (!row) return;
      const def = ledgerDefinitionForRecord(row);
      if (!canReverseLedgerRecord(def)) {
        toast("该账本只能通过原业务、凭证或核销流程处理");
        return;
      }
      row.status = "冲正待审批";
      row.updatedAt = now();
      row.note = [row.note, "已发起冲正申请，等待凭证审批和外部核销复核"].filter(Boolean).join("；");
      state.auditTrail.unshift({ time: now(), actor: "财务", action: "发起冲正申请", target: row.sourceId, result: "冲正待审批" });
      saveState();
      render();
      toast("已发起冲正申请，等待审批");
    }

    function currentViewPayload() {
      if (ui.module === "config") return { sheet: ui.configSheet, rows: currentConfigRows() };
      if (ui.module === "dashboard") return { summary: businessFundingSummary(), rows: businessFundingRows() };
      if (ui.module === "business-details") return { 筛选条件: businessFundingFilterLabels(), rows: currentBusinessFundingRows() };
      if (ui.module === "ledgers") {
        const def = activeLedgerDefinition();
        return {
          账本: def.模块 || ui.ledgerTab,
          会计口径: ledgerAuditScope(def),
          筛选条件: {
            影响主体: ui.ledgerSubjectFilter || "全部",
            业务主体: ui.ledgerBusinessEntityFilter || "全部",
            业务类型: ui.ledgerBizTypeFilter || "全部",
            方向: ui.ledgerDirectionFilter || "全部",
            核销状态: ui.ledgerReconStatusFilter || "全部",
            入账口径: ui.ledgerPostingScopeFilter || "全部",
            开始日期: ui.ledgerBoardFrom || "全部",
            结束日期: ui.ledgerBoardTo || "全部"
          },
          rows: filteredRows(filterLedgerAuditRows(ledgerAuditRows(ledgerCenterRecordsFor(def), def)))
        };
      }
      if (ui.module === "entries") return { 筛选条件: voucherResultFilterLabels(), rows: currentVoucherResultRows() };
      if (ui.module === "reconciliation") return { 筛选条件: reconciliationFilterLabels(), rows: currentReconciliationRows() };
      if (ui.module === "acceptance") return state.acceptanceItems;
      if (ui.module === "reports") return reportExportPayload();
      if (ui.module === "finance-stats") return financeStatExportPayload();
      return state;
    }

    function currentConfigRows() {
      if (ui.configSheet === "覆盖校验") return coverageCheckRows();
      if (ui.configSheet === "科目编码") return subjectCodeRows();
      return configSheetRows(ui.configSheet);
    }

    function switchModule(moduleId) {
      if (moduleId === "subject-codes") {
        ui.configSheet = "科目编码";
        moduleId = "config";
      }
      if (moduleId === "rules") {
        ui.configSheet = "业务逻辑规则";
        moduleId = "config";
      }
      if (moduleId === "vouchers") moduleId = "entries";
      ui.module = moduleId;
      ui.sidebarOpen = false;
      closeDrawer();
      render();
    }

    function focusVoucherEntries(voucherNo) {
      ui.selectedVoucher = voucherNo;
      ["accounting-entry-changes"].forEach(tableId => {
        const tableState = ui.table[tableId] || (ui.table[tableId] = { page: 1, query: "", sortKey: "", sortDir: "asc" });
        tableState.query = voucherNo;
        tableState.page = 1;
      });
      switchModule("entries");
    }

    document.addEventListener("click", event => {
      const target = event.target.closest("button");
      if (!target) return;
      const nav = target.dataset.nav;
      const action = target.dataset.action;
      if (nav) {
        switchModule(nav);
        return;
      }
      if (target.dataset.tableSort) {
        const tableId = target.dataset.tableSort;
        const key = target.dataset.key;
        const tableState = ui.table[tableId] || (ui.table[tableId] = { page: 1, query: "", sortKey: "", sortDir: "asc" });
        tableState.sortDir = tableState.sortKey === key && tableState.sortDir === "asc" ? "desc" : "asc";
        tableState.sortKey = key;
        render();
        return;
      }
      if (target.dataset.tablePage) {
        const tableState = ui.table[target.dataset.tablePage];
        if (tableState) tableState.page = Number(target.dataset.page || 1);
        render();
        return;
      }
      if (!action) return;
      handleAction(action, target);
    });

    document.addEventListener("input", event => {
      const target = event.target;
      if (target.id === "globalSearch") {
        ui.globalSearch = target.value;
        render();
      }
      if (target.id === "ledgerBoardFrom") {
        ui.ledgerBoardFrom = target.value;
        ui.ledgerBoardQuick = "";
        render();
      }
      if (target.id === "ledgerBoardTo") {
        ui.ledgerBoardTo = target.value;
        ui.ledgerBoardQuick = "";
        render();
      }
      if (target.id === "ledgerSubjectFilter") {
        ui.ledgerSubjectFilter = target.value;
        render();
      }
      if (target.id === "financeStatFrom") {
        ui.financeStatFrom = target.value;
        render();
      }
      if (target.id === "financeStatTo") {
        ui.financeStatTo = target.value;
        render();
      }
      if (target.id === "financeStatSubject") {
        ui.financeStatSubject = target.value;
        render();
      }
      if (target.id === "financeStatSiteSearch") {
        ui.financeStatSiteSearch = target.value;
        render();
      }
      if (target.id === "financeStatInitiatorSearch") {
        ui.financeStatInitiatorSearch = target.value;
        render();
      }
      if (target.id === "reportFrom") {
        ui.reportFrom = target.value;
        render();
      }
      if (target.id === "reportTo") {
        ui.reportTo = target.value;
        render();
      }
      if (target.id === "reportEntitySearch") {
        ui.reportEntitySearch = target.value;
        render();
      }
      if (target.id === "reportSiteSearch") {
        ui.reportSiteSearch = target.value;
        render();
      }
      if (target.id === "reportInitiatorSearch") {
        ui.reportInitiatorSearch = target.value;
        render();
      }
      if (target.id === "reportSubjectSearch") {
        ui.reportSubjectSearch = target.value;
        render();
      }
      if (target.dataset.tableSearch) {
        const tableState = ui.table[target.dataset.tableSearch] || (ui.table[target.dataset.tableSearch] = { page: 1, query: "", sortKey: "", sortDir: "asc" });
        tableState.query = target.value;
        tableState.page = 1;
        render();
      }
    });

    document.addEventListener("change", event => {
      const target = event.target;
      const selectBindings = {
        businessFundingSiteFilter: "businessFundingSiteFilter",
        businessFundingInitiatorTypeFilter: "businessFundingInitiatorTypeFilter",
        businessFundingInitiatorFilter: "businessFundingInitiatorFilter",
        businessFundingBizTypeFilter: "businessFundingBizTypeFilter",
        businessFundingDirectionFilter: "businessFundingDirectionFilter",
        businessFundingVoucherStatusFilter: "businessFundingVoucherStatusFilter",
        businessFundingReconStatusFilter: "businessFundingReconStatusFilter",
        businessFundingBackendStatusFilter: "businessFundingBackendStatusFilter",
        entrySiteFilter: "entrySiteFilter",
        entryInitiatorTypeFilter: "entryInitiatorTypeFilter",
        entryInitiatorFilter: "entryInitiatorFilter",
        entryBizTypeFilter: "entryBizTypeFilter",
        entryVoucherFilter: "entryVoucherFilter",
        entryTemplateFilter: "entryTemplateFilter",
        entryBalanceStatusFilter: "entryBalanceStatusFilter",
        entryLedgerFilter: "entryLedgerFilter",
        entryReconFilter: "entryReconFilter",
        entryBackendFilter: "entryBackendFilter",
        reconciliationSiteFilter: "reconciliationSiteFilter",
        reconciliationInitiatorTypeFilter: "reconciliationInitiatorTypeFilter",
        reconciliationInitiatorFilter: "reconciliationInitiatorFilter",
        reconciliationObjectFilter: "reconciliationObjectFilter",
        reconciliationSourceDocFilter: "reconciliationSourceDocFilter",
        reconciliationRelationFilter: "reconciliationRelationFilter",
        reconciliationStatusFilter: "reconciliationStatusFilter",
        reconciliationVoucherFilter: "reconciliationVoucherFilter",
        reconciliationLedgerFilter: "reconciliationLedgerFilter",
        reconciliationBackendFilter: "reconciliationBackendFilter"
      };
      if (selectBindings[target.id]) {
        ui[selectBindings[target.id]] = target.value;
        render();
        return;
      }
      if (target.id === "templateEditCode") {
        ui.templateEditCode = target.value;
        render();
      }
      if (target.id === "templateEntryStepSelect") {
        ui.templateEntryEditId = target.value;
        showTemplateDetailDrawer(ui.templateEditCode);
        return;
      }
      if (target.id === "editEntrySubjectCodeSelect") {
        syncTemplateEntrySubjectControls();
        return;
      }
      if (target.id === "editEntryNatureSelect" || target.id === "editEntryReportSelect") {
        syncTemplateEntryNatureControls();
        return;
      }
      if (target.id === "ledgerBoardFrom") {
        ui.ledgerBoardFrom = target.value;
        ui.ledgerBoardQuick = "";
        render();
      }
      if (target.id === "ledgerBoardTo") {
        ui.ledgerBoardTo = target.value;
        ui.ledgerBoardQuick = "";
        render();
      }
      if (target.id === "ledgerModuleSelect") {
        ui.ledgerTab = target.value;
        render();
      }
      if (target.id === "ledgerBizTypeFilter") {
        ui.ledgerBizTypeFilter = target.value;
        render();
      }
      if (target.id === "ledgerBusinessEntityFilter") {
        ui.ledgerBusinessEntityFilter = target.value;
        render();
      }
      if (target.id === "ledgerDirectionFilter") {
        ui.ledgerDirectionFilter = target.value;
        render();
      }
      if (target.id === "ledgerReconStatusFilter") {
        ui.ledgerReconStatusFilter = target.value;
        render();
      }
      if (target.id === "ledgerPostingScopeFilter") {
        ui.ledgerPostingScopeFilter = target.value;
        render();
      }
      if (target.id === "financeStatFrom") {
        ui.financeStatFrom = target.value;
        render();
      }
      if (target.id === "financeStatTo") {
        ui.financeStatTo = target.value;
        render();
      }
      if (target.id === "reportFrom") {
        ui.reportFrom = target.value;
        render();
      }
      if (target.id === "reportTo") {
        ui.reportTo = target.value;
        render();
      }
      if (target.id === "reportEntityTypeFilter") {
        ui.reportEntityTypeFilter = target.value;
        render();
      }
      if (target.id === "reportSubjectTypeFilter") {
        ui.reportSubjectTypeFilter = target.value;
        render();
      }
      if (target.id === "reportDirectionFilter") {
        ui.reportDirectionFilter = target.value;
        render();
      }
      if (target.id === "reportBizTypeFilter") {
        ui.reportBizTypeFilter = target.value;
        render();
      }
      if (target.id === "reportReconStatusFilter") {
        ui.reportReconStatusFilter = target.value;
        render();
      }
      if (target.id === "reportBackendStatusFilter") {
        ui.reportBackendStatusFilter = target.value;
        render();
      }
      if (target.id === "financeStatEntityTypeFilter") {
        ui.financeStatEntityTypeFilter = target.value;
        render();
      }
      if (target.id === "financeStatBizTypeFilter") {
        ui.financeStatBizTypeFilter = target.value;
        render();
      }
      if (target.id === "financeStatSubjectTypeFilter") {
        ui.financeStatSubjectTypeFilter = target.value;
        render();
      }
      if (target.id === "financeStatStatusFilter") {
        ui.financeStatStatusFilter = target.value;
        render();
      }
    });

    $("#priorityFilter").addEventListener("change", event => { ui.priority = event.target.value; render(); });
    $("#statusFilter").addEventListener("change", event => { ui.status = event.target.value; render(); });

    function handleAction(action, target) {
      if (action === "toggle-sidebar") { ui.sidebarOpen = !ui.sidebarOpen; render(); return; }
      if (action === "close-drawer") { closeDrawer(); return; }
      if (action === "config-group") {
        const group = configGroups.find(item => item.id === target.dataset.id) || configGroups[0];
        ui.configSheet = group.sheets[0];
        render();
        return;
      }
      if (action === "config-tab") { ui.configSheet = target.dataset.id; render(); return; }
      if (action === "select-template-edit") { showTemplateDetailDrawer(target.dataset.template); return; }
      if (action === "detail-template") { showTemplateDetailDrawer(target.dataset.template); return; }
      if (action === "add-template-entry") { addTemplateEntryLine(target.dataset.template); return; }
      if (action === "edit-template-entry") { showTemplateEntryEditor(target.dataset.id); return; }
      if (action === "clone-template-entry") { cloneTemplateEntryLine(target.dataset.id); return; }
      if (action === "delete-template-entry") { deleteTemplateEntryLine(target.dataset.id); return; }
      if (action === "save-template-entry") { saveTemplateEntryLine(target.dataset.id); return; }
      if (action === "ledger-tab") { ui.ledgerTab = target.dataset.id; render(); return; }
      if (action === "report-tab") { ui.reportTab = target.dataset.id; render(); return; }
      if (action === "finance-stat-tab") { ui.financeStatTab = target.dataset.id; render(); return; }
      if (action === "ledger-board-quick") { applyLedgerBoardQuick(target.dataset.range); return; }
      if (action === "clear-ledger-board-dates") { ui.ledgerBoardFrom = ""; ui.ledgerBoardTo = ""; ui.ledgerBoardQuick = ""; render(); return; }
      if (action === "clear-ledger-filters") {
        ui.ledgerSubjectFilter = "";
        ui.ledgerBusinessEntityFilter = "";
        ui.ledgerBizTypeFilter = "";
        ui.ledgerDirectionFilter = "";
        ui.ledgerReconStatusFilter = "";
        ui.ledgerPostingScopeFilter = "";
        render();
        return;
      }
      if (action === "clear-business-funding-filters") {
        ui.businessFundingSiteFilter = "";
        ui.businessFundingInitiatorTypeFilter = "";
        ui.businessFundingInitiatorFilter = "";
        ui.businessFundingBizTypeFilter = "";
        ui.businessFundingDirectionFilter = "";
        ui.businessFundingVoucherStatusFilter = "";
        ui.businessFundingReconStatusFilter = "";
        ui.businessFundingBackendStatusFilter = "";
        render();
        return;
      }
      if (action === "clear-entry-filters") {
        ui.entrySiteFilter = "";
        ui.entryInitiatorTypeFilter = "";
        ui.entryInitiatorFilter = "";
        ui.entryBizTypeFilter = "";
        ui.entryVoucherFilter = "";
        ui.entryTemplateFilter = "";
        ui.entryBalanceStatusFilter = "";
        ui.entryLedgerFilter = "";
        ui.entryReconFilter = "";
        ui.entryBackendFilter = "";
        render();
        return;
      }
      if (action === "clear-reconciliation-filters") {
        ui.reconciliationSiteFilter = "";
        ui.reconciliationInitiatorTypeFilter = "";
        ui.reconciliationInitiatorFilter = "";
        ui.reconciliationObjectFilter = "";
        ui.reconciliationSourceDocFilter = "";
        ui.reconciliationRelationFilter = "";
        ui.reconciliationStatusFilter = "";
        ui.reconciliationVoucherFilter = "";
        ui.reconciliationLedgerFilter = "";
        ui.reconciliationBackendFilter = "";
        render();
        return;
      }
      if (action === "clear-report-filters") {
        ui.reportFrom = "";
        ui.reportTo = "";
        ui.reportEntityTypeFilter = "";
        ui.reportEntitySearch = "";
        ui.reportSiteSearch = "";
        ui.reportInitiatorSearch = "";
        ui.reportSubjectTypeFilter = "";
        ui.reportSubjectSearch = "";
        ui.reportDirectionFilter = "";
        ui.reportBizTypeFilter = "";
        ui.reportReconStatusFilter = "";
        ui.reportBackendStatusFilter = "";
        render();
        return;
      }
      if (action === "clear-finance-stat-filters") {
        ui.financeStatFrom = "";
        ui.financeStatTo = "";
        ui.financeStatSubject = "";
        ui.financeStatEntityTypeFilter = "";
        ui.financeStatSiteSearch = "";
        ui.financeStatInitiatorSearch = "";
        ui.financeStatBizTypeFilter = "";
        ui.financeStatSubjectTypeFilter = "";
        ui.financeStatStatusFilter = "";
        render();
        return;
      }
      if (action === "open-ledger-card") { ui.ledgerTab = target.dataset.id; switchModule("ledgers"); return; }
      if (action === "export-view") { downloadJson(`finance-center-${ui.module}.json`, currentViewPayload()); return; }
      if (action === "detail") { const row = state.risks.find(item => item.风险编号 === target.dataset.id); openDrawer("风险详情", detailList(row)); return; }
      if (action === "detail-business-funding") {
        const row = businessFundingRows().find(item => item._id === target.dataset.id);
        openDrawer("业务资金链路", detailList(row, ["业务时间","业务单号","业务类型","站点ID","站点名称","发起主体身份","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","资金方向","交易金额","手续费","实际入账/出款","影响余额","影响控制台账","关联账本","凭证号","借贷状态","核销状态","后端落账状态","财务处理建议","技术源表","模板编码","核销关系"]));
        return;
      }
      if (action === "detail-config") {
        const row = findConfigRow(target.dataset.sheet, target.dataset.row);
        const keys = target.dataset.sheet === "会计分录"
          ? ["模板编码","分录步骤编号","分录序号","分录组","分录性质","影响模块","借贷/信用方向","账本/账户","科目编码","引用模板","科目名称","科目类型","金额表达式","主体","来源/去向","源表","源字段","是否正式分录","进入报表","更新账户流水","余额更新状态","当前是否覆盖","当前系统事实","备注","检查金额","matrixAction","matrixCoverage","supplementNote","idempotencyKey"]
          : Object.keys(row || {});
        openDrawer(`${target.dataset.sheet} 详情`, detailList(row, keys));
        return;
      }
      if (action === "detail-coverage") { const row = coverageCheckRows().find(item => item.动作 === target.dataset.id); openDrawer("做账覆盖校验详情", detailList(row)); return; }
      if (action === "detail-subject-code") { const row = state.subjects.find(item => item.subjectId === target.dataset.id); openDrawer("科目编码详情", detailList(row, ["原始科目编码","科目编码","科目名称","科目类型","增加方向","减少方向","对应主体","对应系统字段/表","是否进正式分录","编码状态","编码更新时间","备注"])); return; }
      if (action === "edit-subject-code") { showEditSubjectCode(target.dataset.id); return; }
      if (action === "save-subject-code") { saveSubjectCode(target.dataset.id); return; }
      if (action === "detail-ledger") {
        const row = state.ledgerRecords.find(item => item.id === target.dataset.id);
        const def = ledgerDefinitionForRecord(row);
        const voucher = (state.voucherBatches || []).find(batch => batch.voucherNo === row?.voucherNo) || {};
        const attribution = buildEntityAttribution({
          sourceId: row?.sourceId || voucher.sourceId || "",
          voucherNo: row?.voucherNo || voucher.voucherNo || "",
          bizName: row?.closeLoopName || voucher.bizName || "",
          entity: row?.subject || row?.businessEntity || def?.业务主体 || "",
          sourceTable: row?.sourceTable || voucher.sourceTable || "",
          sourceDoc: row?.sourceDoc || voucher.sourceDoc || "",
          supplementLedger: row?.supplementLedger || voucher.supplementLedger || "",
          note: `${row?.note || ""} ${def?.开发说明 || ""}`
        }, JSON.stringify({ row, def, voucher }));
        openDrawer("账本详情", detailList({ ...attribution, ...(row || {}) }));
        return;
      }
      if (action === "detail-reconciliation") {
        const raw = state.reconciliationRecords.find(item => item.id === target.dataset.id);
        const row = reconciliationDisplayRows().find(item => item._id === target.dataset.id) || raw;
        openDrawer("核销对账详情", detailList({ ...(raw || {}), ...(row || {}) }));
        return;
      }
      if (action === "request-ledger-reversal") { requestLedgerReversal(target.dataset.id); return; }
      if (action === "select-voucher") { focusVoucherEntries(target.dataset.id); return; }
      if (action === "detail-voucher") {
        const row = state.voucherBatches.find(item => item.voucherNo === target.dataset.id);
        const attribution = buildEntityAttribution({
          sourceId: row?.sourceId || "",
          voucherNo: row?.voucherNo || "",
          bizName: row?.bizName || "",
          sourceTable: row?.sourceTable || "",
          sourceDoc: row?.sourceDoc || "",
          supplementLedger: row?.supplementLedger || "",
          note: `${row?.matrixAction || ""} ${row?.supplementNote || ""}`
        }, JSON.stringify(row || {}));
        openDrawer("凭证详情", detailList({ ...(row || {}), ...attribution }, ["voucherNo","postedAt","sourceId","bizName","站点ID","站点名称","发起主体身份","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","templateCode","status","debit","credit","controlAmount","lines"]));
        return;
      }
      if (action === "detail-line") {
        const batch = state.voucherBatches.find(item => item.voucherNo === target.dataset.voucher);
        const lineIndex = (batch?.lines || []).findIndex(line => String(line.lineNo) === String(target.dataset.line));
        const row = lineIndex >= 0 ? voucherLineDetailRow(batch.lines[lineIndex], lineIndex) : null;
        openDrawer("凭证明细", detailList(row));
        return;
      }
      if (action === "detail-acceptance") { const row = state.acceptanceItems.find(item => item.开发项 === target.dataset.id); openDrawer("验收详情", detailList(row)); return; }
      if (action === "complete-acceptance") { setAcceptance(target.dataset.id, "已验收", 100); return; }
      if (action === "review-acceptance") { setAcceptance(target.dataset.id, "评审中", 70); return; }
      if (action === "mark-all-reviewed") { state.acceptanceItems.forEach(item => { item.uiStatus = "评审中"; item.progress = Math.max(Number(item.progress || 0), 70); }); saveState(); render(); toast("验收项已标记评审中"); return; }
    }

    function setAcceptance(id, status, progress) {
      const row = state.acceptanceItems.find(item => item.开发项 === id);
      if (!row) return;
      row.uiStatus = status;
      row.progress = progress;
      state.auditTrail.unshift({ time: now(), actor: "评审", action: "更新验收项", target: row.开发项, result: status });
      saveState();
      render();
      toast("验收状态已更新");
    }

"use strict";
function render() {
      if (!allModules().some(module => module.id === ui.module)) ui.module = "dashboard";
      renderNav();
      $("#breadcrumb").textContent = `财务中心 / ${currentModule().label}`;
      $("#globalSearch").value = ui.globalSearch;
      $("#priorityFilter").value = ui.priority;
      $("#statusFilter").value = ui.status;
      $("#sidebar").classList.toggle("open", ui.sidebarOpen);
      const app = $("#app");
      if (ui.module === "dashboard") app.innerHTML = renderDashboard();
      if (ui.module === "business-details") app.innerHTML = renderBusinessFundingDetails();
      if (ui.module === "config") app.innerHTML = renderConfig();
      if (ui.module === "ledgers") app.innerHTML = renderLedgers();
      if (ui.module === "entries") app.innerHTML = renderAccountingEntries();
      if (ui.module === "reconciliation") app.innerHTML = renderReconciliation();
      if (ui.module === "reports") app.innerHTML = renderReports();
      if (ui.module === "finance-stats") app.innerHTML = renderFinanceStats();
      hydrateDerivedControls();
    }
    function modules() {
      return allModules().filter(module => !module.hidden);
    }
    function allModules() {
      return [
        { id: "dashboard", label: "资金账变总览", group: "财务记账", count: businessFundingRows().length },
        { id: "business-details", label: "业务资金明细", group: "财务记账", count: businessFundingRows().length },
        { id: "ledgers", label: "账本中心", group: "财务记账", count: ledgerCenterDefinitions().length },
        { id: "entries", label: "会计分录报表", group: "财务记账", count: state.voucherBatches.length },
        { id: "reconciliation", label: "核销对账", group: "财务记账", count: reconciliationDisplayRows().length },
        { id: "reports", label: "财务报表", group: "报表", count: 3 },
        { id: "config", label: "会计模板配置", group: "配置", count: configSheets.length },
        { id: "finance-stats", label: "财务统计", group: "隐藏", count: financeStatTabs.length, hidden: true }
      ];
    }
    function currentModule() {
      return allModules().find(module => module.id === ui.module) || allModules()[0];
    }
    const moduleGuides = {
      dashboard: {
        title: "本模块说明",
        summary: "进入财务中心后的总览页，用来快速判断资金账变是否已入账、凭证是否平衡、哪些核销或后端落账还需要处理。",
        items: [
          ["核心指标", "汇总业务资金事件、交易金额、手续费、未核销差异、后端待补和借贷差异。"],
          ["快捷入口", "进入业务资金明细、账本中心、会计分录报表、核销对账、财务报表和会计模板配置。"],
          ["最近资金变动", "按业务单查看最近入账事件，并可下钻到资金链路、凭证、账本和核销记录。"],
          ["账本看板", "按账本类型汇总正式资金账本和必要信用台账，先看异常再进明细。"],
          ["会计检查", "集中提示 G/F/A、W/F/N、信用台账隔离等关键做账口径。"]
        ],
        boundary: "本页展示的是原型汇总口径，不代表真实后端已完成清算、核销执行或期间结账。"
      },
      "business-details": {
        title: "本模块说明",
        summary: "逐笔列出平台业务资金变动，让财务能看清来源单据、主体归属、金额口径、凭证、账本和核销状态。",
        items: [
          ["业务来源", "覆盖充值、提现、转账、红包、奖励、佣金、月结、场馆费和游戏结算等资金事件。"],
          ["主体归属", "展示站点、发起主体、代理、会员的名称和 ID，方便按业务责任链核对。"],
          ["金额口径", "区分交易金额、手续费、实际入账或出款、余额影响和控制台账影响。"],
          ["链路下钻", "每笔业务可继续查看资金链路、凭证、账本或核销记录。"],
          ["处理状态", "展示借贷状态、核销状态、后端落账状态和财务处理建议。"]
        ],
        boundary: "主体名称和 ID 是原型稳定演示归属，生产环境仍需要后端在源单、凭证、账本和核销记录中真实落字段。"
      },
      ledgers: {
        title: "本模块说明",
        summary: "给会计审核资金账本用，只回答哪笔业务影响了哪个账本、方向、金额、余额变化、凭证号和核销状态。",
        items: [
          ["账本类型", "通过下拉切换官方现金、三方清算、主钱包、余额、提现待付、红包待领、预付、月结、场馆和游戏等账本。"],
          ["资金记录", "主表保留业务时间、业务单号、影响账本、主体、方向、金额、前值、后值和结账期间。"],
          ["账本口径", "正式资金账本和信用台账分开标识，信用台账不进入正式资产负债报表。"],
          ["凭证下钻", "从账本记录的凭证号查看凭证批次和分录行，凭证不是账本中心一级页签。"],
          ["冲正申请", "账本中心只发起冲正申请，不允许绕过来源单据直接改账。"]
        ],
        boundary: "本页补齐的是原型账本记录，官方账户流水、通道清算、提现待付等真实后端账本仍需后续落表。"
      },
      entries: {
        title: "本模块说明",
        summary: "按凭证维度查看每笔业务的会计分录结果，重点检查正式分录、信用台账、借贷状态和对应账本。",
        items: [
          ["凭证汇总", "一行业务凭证展示来源单号、业务类型、模板编码、凭证号和后端覆盖状态。"],
          ["分录步骤", "显示该凭证包含的步骤数量、正式分录行数和信用台账行数。"],
          ["借贷状态", "按当前筛选重算借方金额、贷方金额、信用台账金额和借贷差。"],
          ["对应账本", "展示凭证影响的补记账本和核销关系，方便从凭证追到账本。"],
          ["凭证详情", "完整分录行放入详情抽屉，主表不重复铺开技术明细。"]
        ],
        boundary: "本页是原型凭证和分录明细，不代表真实总账凭证引擎或总账明细表已经上线。"
      },
      reconciliation: {
        title: "本模块说明",
        summary: "用于核对业务源单、凭证、账本和清算关系是否对上，帮助财务定位未核销、差异或待确认记录。",
        items: [
          ["核销对象", "覆盖官方账户、三方通道、手续费、提现待付、红包待领、月结、场馆费和游戏结算等核销对象。"],
          ["来源单据", "展示业务单号、来源单据、核销关系、关联账本和凭证号。"],
          ["差异金额", "标识待清算、部分清算、差异复核和需确认记录的差异金额。"],
          ["主体筛选", "可按站点、发起主体、代理和会员维度过滤核销记录。"],
          ["凭证关联", "从核销记录查看关联凭证，确认分录和账本是否使用同一来源链路。"]
        ],
        boundary: "本页展示核销追踪口径，不执行真实清算、外部对账或核销程序。"
      },
      reports: {
        title: "本模块说明",
        summary: "按会计报表口径汇总演示凭证，明确正式分录和信用台账分开统计，避免把额度类数据误当现金资产。",
        items: [
          ["资产负债", "汇总正式资产和负债科目，关注官方账户、三方清算、提现待付、红包待领和月结应收。"],
          ["收入成本", "汇总分润、月租、游戏净收入、奖励成本、场馆费和派奖成本等正式科目。"],
          ["信用账户", "单列 900xxx、fund_pool_balance、额度、钱包、冻结和控制类台账，不进入借贷平衡。"],
          ["主体维度", "按站点、发起主体、代理和会员维度展示，便于财务按业务归属复核。"],
          ["报表导出", "导出当前页签和筛选结果，口径跟页面一致。"]
        ],
        boundary: "报表基于静态演示凭证汇总，不代表真实财务报表已经由后端生成或完成结账锁定。"
      },
      config: {
        title: "本模块说明",
        summary: "维护资金账变入账需要的基础会计配置，用来确认科目、编码、模板、分录和凭证生成规则是否符合当前业务。",
        items: [
          ["会计科目表", "查看资产、负债、收入、成本和信用类科目，以及辅助核算维度。"],
          ["科目编码", "只演示编码调整，科目名称和科目含义保持锁定。"],
          ["会计模板", "按业务事件维护入账模板，并在详情中维护分录步骤。"],
          ["会计分录", "定义每个模板的借方、贷方、信用台账、金额公式和来源字段。"],
          ["凭证规则", "说明业务动作如何生成凭证，哪些正式制证，哪些只做来源或信用追踪。"]
        ],
        boundary: "配置保存在浏览器本地演示状态，生产环境还需要审批、版本、启停、锁账和后端规则引擎。"
      },
      "finance-stats": {
        title: "本模块说明",
        summary: "按期间、主体和资金模块查看更细的财务统计，补充财务报表只能按科目余额汇总的问题。",
        items: [
          ["官方账户", "统计官方收款和出款流水口径，辅助核对现金类业务。"],
          ["三方清算", "统计三方通道、手续费、应收、实收和差异相关口径。"],
          ["待付待领", "统计提现待付、红包待领、月结应收、场馆费应付等账龄和余额。"],
          ["成本结算", "统计奖励成本、佣金、场馆费、游戏投注和派奖相关金额。"],
          ["信用余额", "统计额度、控制台账、钱包和预付内部信用，不进入正式报表。"]
        ],
        boundary: "统计数据来自原型凭证、账本和核销追踪，不连接真实数据库。"
      }
    };
    function renderModuleGuide(moduleId) {
      const guide = moduleGuides[moduleId];
      if (!guide) return "";
      return `
        <section class="module-guide" aria-label="${escapeAttr(guide.title)}">
          <div class="module-guide-main">
            <h2>${escapeHtml(guide.title)}</h2>
            <p>${escapeHtml(guide.summary)}</p>
          </div>
          <div class="module-guide-grid">
            ${guide.items.map(([label, text]) => `
              <div class="module-guide-item">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(text)}</span>
              </div>
            `).join("")}
          </div>
          <div class="module-guide-boundary">${escapeHtml(guide.boundary)}</div>
        </section>
      `;
    }
    const ledgerCenterExcludedModules = [
      "官方账户主档",
      "凭证批次",
      "凭证明细",
      "业务映射表",
      "做账幂等关联",
      "老佣金迁移台账（一次性/只读）",
      "运营费用分摊信用台账",
      "站点充提手续费补录账本",
      "额度调账与转账凭证源",
      "额度调拨/转账凭证源",
      "核销关系台账"
    ];
    const ledgerCenterExcludedTables = [
      "official_account",
      "accounting_voucher_batch",
      "accounting_voucher_line",
      "finance_biz_type_mapping",
      "accounting_idempotency_link",
      "commission_record_migration",
      "commission_expense_source_snapshot",
      "site_deposit_withdraw_fee_record",
      "quota_adjustment_transfer_voucher",
      "quota_transfer_voucher",
      "accounting_reconciliation_link"
    ];
    function ledgerCenterDefinitions() {
      return (state.ledgerDefinitions || []).filter(isLedgerCenterDefinition);
    }
    function isLedgerCenterDefinition(def) {
      if (!def) return false;
      const moduleName = String(def.模块 || "");
      const tableName = String(def.建议表名 || "");
      const nature = String(def.账本性质 || "");
      if (ledgerCenterExcludedModules.includes(moduleName)) return false;
      if (ledgerCenterExcludedTables.includes(tableName)) return false;
      const text = `${moduleName} ${tableName} ${def.源表 || ""} ${nature} ${def.操作口径 || ""}`;
      if (/账户主档|配置|映射|幂等|迁移|正式凭证|凭证明细|业务源单\/凭证源|费用分摊信用台账|补录账本|核销关联/.test(text)) return false;
      return /正式资金账本|信用台账|待接总账|现金流水|清算|待付|待领|应收|应付|钱包|余额|额度|预付|佣金|游戏结算|场馆/.test(text);
    }
    function activeLedgerDefinition() {
      const definitions = ledgerCenterDefinitions();
      return definitions.find(row => row.模块 === ui.ledgerTab) || definitions[0] || state.ledgerDefinitions[0] || {};
    }
    function ledgerCenterRecordsFor(def) {
      if (!def) return [];
      return (state.ledgerRecords || [])
        .filter(row => row.ledgerModule === def.模块)
        .filter(row => dateInLedgerBoardRange(row.updatedAt || row.postedAt || ""));
    }
    function ledgerAuditScope(def) {
      const text = `${def?.模块 || ""} ${def?.建议表名 || ""} ${def?.账本性质 || ""} ${def?.["影响科目/台账"] || ""} ${def?.开发说明 || ""}`;
      if (/待接总账|总账源/.test(text)) return "来源总账（待接正式记账）";
      if (def?.是否正式分录 === "是") return "正式资金账本";
      if (def?.是否正式分录 === "部分") return "正式/信用分列";
      if (/信用|900|fund_pool_balance|额度|冻结|预付金内部|费用快照/.test(text) || def?.是否正式分录 === "否") return "信用台账（不进正式报表）";
      return "正式资金账本";
    }
    function ledgerAuditRows(records, def) {
      const voucherByNo = new Map((state.voucherBatches || []).map(batch => [batch.voucherNo, batch]));
      return (records || []).map(row => {
        const voucher = voucherByNo.get(row.voucherNo) || {};
        const bizName = row.closeLoopName || voucher.bizName || businessNameFor(row.templateCode || voucher.templateCode) || row.coverage || def?.模块 || "";
        const businessTime = row.updatedAt || row.postedAt || voucher.postedAt || "";
        const attribution = buildEntityAttribution({
          sourceId: row.sourceId || voucher.sourceId || "",
          voucherNo: row.voucherNo || voucher.voucherNo || "",
          bizName,
          entity: row.subject || row.businessEntity || def?.业务主体 || "",
          sourceTable: row.sourceTable || voucher.sourceTable || def?.源表 || "",
          sourceDoc: row.sourceDoc || voucher.sourceDoc || "",
          supplementLedger: row.supplementLedger || voucher.supplementLedger || def?.建议表名 || "",
          note: `${row.note || ""} ${row.coverage || ""} ${def?.开发说明 || ""}`
        }, `${bizName} ${row.subject || ""} ${row.businessEntity || ""} ${def?.业务主体 || ""} ${def?.模块 || ""} ${def?.开发说明 || ""}`);
        return {
          _recordId: row.id,
          _voucherNo: row.voucherNo || "",
          业务时间: businessTime,
          业务单号: row.sourceId || voucher.sourceId || "",
          业务类型: bizName,
          影响账本: row.ledgerModule || def?.模块 || "",
          主体: row.subject || row.businessEntity || def?.业务主体 || "",
          业务主体: row.businessEntity || def?.业务主体 || "",
          站点ID: attribution.站点ID,
          站点名称: attribution.站点名称,
          发起主体身份: attribution.initiatorType,
          发起主体ID: attribution.initiatorId,
          发起主体名称: attribution.initiatorName,
          代理ID: attribution.代理ID,
          代理名称: attribution.代理名称,
          会员ID: attribution.会员ID,
          会员名称: attribution.会员名称,
          方向: row.direction || "",
          金额: Number(row.amount || 0),
          前值: Number(row.beforeBalance || 0),
          后值: Number(row.afterBalance || 0),
          凭证号: row.voucherNo || "",
          核销状态: row.status || row.currentPostingStatus || "",
          结账期间: row.closePeriod || String(businessTime).slice(0, 7),
          入账口径: ledgerAuditScope(def)
        };
      });
    }
    function filterLedgerAuditRows(rows) {
      return (rows || []).filter(row => {
        const subject = normalize(ui.ledgerSubjectFilter || "");
        if (subject && !normalize([row.主体, row.业务主体, row.发起主体身份, row.发起主体ID, row.发起主体名称, row.站点ID, row.站点名称, row.代理ID, row.代理名称, row.会员ID, row.会员名称].join(" ")).includes(subject)) return false;
        if (ui.ledgerBusinessEntityFilter && row.业务主体 !== ui.ledgerBusinessEntityFilter) return false;
        if (ui.ledgerBizTypeFilter && row.业务类型 !== ui.ledgerBizTypeFilter) return false;
        if (ui.ledgerDirectionFilter && row.方向 !== ui.ledgerDirectionFilter) return false;
        if (ui.ledgerReconStatusFilter && row.核销状态 !== ui.ledgerReconStatusFilter) return false;
        if (ui.ledgerPostingScopeFilter && row.入账口径 !== ui.ledgerPostingScopeFilter) return false;
        return true;
      });
    }
    function syncLedgerFilterOptions(rows) {
      const optionMap = {
        ledgerBusinessEntityFilter: "业务主体",
        ledgerBizTypeFilter: "业务类型",
        ledgerDirectionFilter: "方向",
        ledgerReconStatusFilter: "核销状态",
        ledgerPostingScopeFilter: "入账口径"
      };
      Object.entries(optionMap).forEach(([uiKey, rowKey]) => {
        if (ui[uiKey] && !uniqueLedgerValues(rows, rowKey).includes(ui[uiKey])) ui[uiKey] = "";
      });
    }
    function uniqueLedgerValues(rows, key) {
      return Array.from(new Set((rows || []).map(row => row[key]).filter(Boolean))).sort(compare);
    }
    function rowEntityLabel(row, idKey, nameKey) {
      const id = row?.[idKey] || "";
      const name = row?.[nameKey] || "";
      return [id, name].filter(Boolean).join(" ");
    }
    function uniqueEntityOptions(rows, idKey, nameKey) {
      return Array.from(new Set((rows || []).map(row => rowEntityLabel(row, idKey, nameKey)).filter(Boolean))).sort(compare);
    }
    function rowMatchesEntityOption(row, idKey, nameKey, value) {
      return !value || rowEntityLabel(row, idKey, nameKey) === value;
    }
    function uniqueRowValues(rows, key) {
      return Array.from(new Set((rows || []).map(row => row[key]).filter(Boolean))).sort(compare);
    }
    function renderLedgerSelectField({ id, label, value, options, placeholder = "全部" }) {
      return `
        <div class="field compact ledger-filter-field">
          <label>${escapeHtml(label)}</label>
          <select id="${escapeAttr(id)}">
            <option value="">${escapeHtml(placeholder)}</option>
            ${options.map(option => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
        </div>
      `;
    }
    function renderLedgerFilters(definitions, activeDef, auditRows) {
      return `
        <div class="ledger-filter-grid">
          <div class="field ledger-ledger-select">
            <label>账本类型</label>
            <select id="ledgerModuleSelect">
              ${definitions.map(def => `<option value="${escapeAttr(def.模块)}" ${def.模块 === activeDef.模块 ? "selected" : ""}>${escapeHtml(def.模块)}</option>`).join("")}
            </select>
          </div>
          <div class="field compact ledger-filter-field">
            <label>影响主体</label>
            <input id="ledgerSubjectFilter" type="search" value="${escapeAttr(ui.ledgerSubjectFilter)}" placeholder="站点 / 代理 / 会员" />
          </div>
          ${renderLedgerSelectField({ id: "ledgerBusinessEntityFilter", label: "业务主体", value: ui.ledgerBusinessEntityFilter, options: uniqueLedgerValues(auditRows, "业务主体") })}
          ${renderLedgerSelectField({ id: "ledgerBizTypeFilter", label: "业务类型", value: ui.ledgerBizTypeFilter, options: uniqueLedgerValues(auditRows, "业务类型") })}
          ${renderLedgerSelectField({ id: "ledgerDirectionFilter", label: "方向", value: ui.ledgerDirectionFilter, options: uniqueLedgerValues(auditRows, "方向") })}
          ${renderLedgerSelectField({ id: "ledgerReconStatusFilter", label: "核销状态", value: ui.ledgerReconStatusFilter, options: uniqueLedgerValues(auditRows, "核销状态") })}
          ${renderLedgerSelectField({ id: "ledgerPostingScopeFilter", label: "入账口径", value: ui.ledgerPostingScopeFilter, options: uniqueLedgerValues(auditRows, "入账口径") })}
          <button class="btn ledger-clear-filter" data-action="clear-ledger-filters">清空筛选</button>
        </div>
      `;
    }
    function renderNav() {
      const grouped = groupBy(modules(), "group");
      $("#nav").innerHTML = Object.entries(grouped).map(([group, items]) => `
        <div class="nav-group">
          <div class="nav-title">${escapeHtml(group)}</div>
          ${items.map(item => `
            <button class="nav-button ${item.id === ui.module ? "active" : ""}" data-nav="${item.id}">
              <span>${escapeHtml(item.label)}</span><span class="nav-count">${item.count}</span>
            </button>
          `).join("")}
        </div>
      `).join("");
    }
    function renderPageHead(title, subtitle, actions = "") {
      return `
        <div class="page-head">
          <div>
            <h1 class="page-title">${escapeHtml(title)}</h1>
            <p class="page-subtitle">${escapeHtml(subtitle)}</p>
          </div>
          <div class="action-bar">${actions}</div>
        </div>
        ${renderModuleGuide(ui.module)}
      `;
    }
    function renderLedgerCard(row) {
      const diffTone = Math.abs(row.diffAmount) < 0.01 ? "green" : row.diffAmount > 0 ? "blue" : "red";
      return `
        <article class="ledger-card">
          <div class="ledger-card-head">
            <div>
              <h3 class="ledger-card-title">${escapeHtml(row.module)}</h3>
              <div class="ledger-card-meta">${escapeHtml(ledgerCardBrief(row))}</div>
            </div>
            <span class="badge ${priorityTone(row.priority)}">${escapeHtml(priorityLabel(row.priority))}</span>
          </div>
          <div class="ledger-card-stats">
            <div class="ledger-stat current"><span>${escapeHtml(row.currentLabel)}</span><strong>${fmtMoney(row.currentAmount)}</strong></div>
            <div class="ledger-stat"><span>${escapeHtml(row.primaryLabel)}</span><strong>${fmtMoney(row.primaryAmount)}</strong></div>
            <div class="ledger-stat"><span>${escapeHtml(row.secondaryLabel)}</span><strong>${fmtMoney(row.secondaryAmount)}</strong></div>
            <div class="ledger-stat ${diffTone}"><span>${escapeHtml(row.diffLabel)}</span><strong>${fmtMoney(row.diffAmount)}</strong></div>
          </div>
          <div class="ledger-card-foot">
            <span>${row.recordCount} 条记录 · ${row.voucherCount} 个凭证</span>
            <button class="btn sm" data-action="open-ledger-card" data-id="${escapeAttr(row.module)}">查看账本</button>
          </div>
        </article>
      `;
    }
    function ledgerCardBrief(row) {
      const typeText = {
        cash: "现金清算",
        balance: "余额额度",
        prepaid: "预付结算",
        reward: "红包奖励",
        settlement: "佣金月结",
        game: "场馆游戏",
        voucher: "凭证关联"
      }[row.cardType] || "账本记录";
      const scope = row.postingScope === "是" ? "正式入账" : row.postingScope === "部分" ? "部分入账" : "信用记录";
      return [typeText, scope, productionDisplayText(row.currentPostingStatus || "待补记录")].filter(Boolean).join(" · ");
    }
    function priorityLabel(value) {
      return { P0: "高", P1: "中", P2: "低" }[String(value || "").toUpperCase()] || "普通";
    }
    function ledgerBoardRows() {
      const voucherByNo = new Map(state.voucherBatches.map(batch => [batch.voucherNo, batch]));
      return ledgerCenterDefinitions().map(def => {
        const records = state.ledgerRecords
          .filter(row => row.ledgerModule === def.模块)
          .filter(row => dateInLedgerBoardRange(row.updatedAt || row.postedAt || ""));
        const vouchers = Array.from(new Set(records.map(row => row.voucherNo).filter(Boolean)))
          .map(no => voucherByNo.get(no))
          .filter(Boolean);
        const lines = vouchers.flatMap(batch => batch.lines || []);
        const profile = ledgerMetricProfile(def);
        const formalLines = lines.filter(line => line.formal && !String(line.subjectCode || "").startsWith("9"));
        const debit = sum(formalLines.filter(line => line.direction === "借"), "amount");
        const credit = sum(formalLines.filter(line => line.direction === "贷"), "amount");
        const increase = sum(records.filter(row => controlDirectionSignForLedger(row.direction || row.status || "") > 0), "amount");
        const decrease = sum(records.filter(row => controlDirectionSignForLedger(row.direction || row.status || "") < 0).map(row => ({ ...row, amount: Math.abs(Number(row.amount || 0)) })), "amount");
        const primaryAmount = profile.mode === "movement" ? increase : (debit || increase);
        const secondaryAmount = profile.mode === "movement" ? decrease : (credit || decrease);
        const currentRecord = latestLedgerRecord(records);
        return {
          module: def.模块,
          tableName: def.建议表名,
          priority: def.priority,
          cardType: profile.cardType,
          nature: def.账本性质 || "",
          businessEntity: def.业务主体 || "",
          currentPostingStatus: def.当前是否已落账 || "",
          postingScope: def.是否正式分录 || "",
          recordCount: records.length,
          voucherCount: vouchers.length,
          currentLabel: profile.currentLabel,
          currentAmount: currentRecord ? Number(currentRecord.afterBalance ?? currentRecord.amount ?? 0) : 0,
          primaryLabel: profile.primaryLabel,
          secondaryLabel: profile.secondaryLabel,
          diffLabel: profile.diffLabel,
          primaryAmount,
          secondaryAmount,
          diffAmount: primaryAmount - secondaryAmount,
          rangeText: ledgerBoardRangeText(records)
        };
      });
    }

    function controlDirectionSignForLedger(direction) {
      const text = String(direction || "");
      if (/减少|冲正|退回|归零|扣减|核销|解锁/.test(text) || /贷/.test(text)) return -1;
      if (/增加|锁定|冻结|借/.test(text)) return 1;
      return 0;
    }
    function ledgerMetricProfile(def) {
      const text = `${def.模块 || ""} ${def.建议表名 || ""} ${def["影响科目/台账"] || ""} ${def.开发说明 || ""}`;
      const cardType = ledgerCardType(def);
      const currentLabel = ledgerCurrentLabel(text);
      if (def.是否控制台账 === "是" || def.是否正式分录 === "否" || /额度|信用|预付|钱包|红包待领|快照|流水/.test(text)) {
        return { mode: "movement", cardType, currentLabel, primaryLabel: "增加额", secondaryLabel: "减少额", diffLabel: "净变动" };
      }
      return { mode: "formal", cardType, currentLabel, primaryLabel: "借额", secondaryLabel: "贷额", diffLabel: "差额" };
    }
    function ledgerBoardGroups(rows) {
      const groupMeta = [
        { id: "cash", title: "现金与三方清算", desc: "官方现金流水、三方通道清算和充提手续费清算；账户主档转入会计配置。" },
        { id: "balance", title: "主体余额与额度", desc: "会员/代理主钱包、站点/总站余额、资金池额度和提现待付。" },
        { id: "prepaid", title: "预付金与外部结算", desc: "预付金内部信用、外部付款和冻结结算。" },
        { id: "reward", title: "红包与奖励费用", desc: "红包待领和奖励成本；费用快照作为来源字段转入详情或配置。" },
        { id: "settlement", title: "佣金与月结", desc: "代理佣金账单和站点月结应收清算；老佣金迁移只在审计追踪查看。" },
        { id: "game", title: "场馆与游戏", desc: "场馆费应付、场馆钱包流水和游戏结算总账源。" },
        { id: "voucher", title: "凭证与清算", desc: "凭证批次、凭证明细、业务映射和幂等关联不作为账本页签，只能从凭证或配置下钻。" }
      ];
      return groupMeta
        .map(group => ({ ...group, rows: rows.filter(row => row.cardType === group.id) }))
        .filter(group => group.rows.length);
    }
    function ledgerCardType(def) {
      const group = def.展示分组 || "";
      if (group === "现金与三方清算") return "cash";
      if (group === "主体余额与额度") return "balance";
      if (group === "预付金与外部结算") return "prepaid";
      if (group === "红包与奖励费用") return "reward";
      if (group === "佣金与月结") return "settlement";
      if (group === "场馆与游戏") return "game";
      if (group === "凭证与核销") return "voucher";
      const text = `${def.模块 || ""} ${def.建议表名 || ""} ${def["影响科目/台账"] || ""} ${def.开发说明 || ""}`;
      if (/现金账户|现金流水|official_account/.test(text)) return "cash";
      if (/凭证批次|凭证明细|业务映射表|accounting_voucher|finance_biz_type_mapping/.test(text)) return "voucher";
      if (/月结|佣金|commission|monthly/.test(text)) return "settlement";
      if (/应付|场馆费|游戏结算|venue|game/.test(text)) return "game";
      if (/红包|奖励|费用|快照|red_packet|reward|expense|snapshot/.test(text)) return "reward";
      if (/手续费|清算|fee/.test(text)) return "cash";
      if (/预付|prepaid/.test(text)) return "prepaid";
      if (/额度|信用|钱包|fund_pool|member_account|quota/.test(text)) return "balance";
      return "voucher";
    }
    function ledgerCurrentLabel(text) {
      if (/额度|信用/.test(text)) return "当前额度";
      if (/月结|应收/.test(text)) return "应收余额";
      if (/应付|场馆费/.test(text)) return "应付余额";
      if (/红包|待领/.test(text)) return "待领余额";
      if (/预付/.test(text)) return "预付余额";
      if (/钱包/.test(text)) return "钱包余额";
      if (/手续费|清算/.test(text)) return "待清算额";
      if (/费用|快照/.test(text)) return "分摊余额";
      if (/奖励|成本/.test(text)) return "成本余额";
      if (/凭证|调账|佣金|迁移/.test(text)) return "当前发生额";
      return "当前余额";
    }
    function latestLedgerRecord(records) {
      return records.slice().sort((a, b) => String(b.updatedAt || b.postedAt || "").localeCompare(String(a.updatedAt || a.postedAt || "")))[0];
    }
    function ledgerBoardQuickButtons() {
      return [
        { id: "today", label: "1日" },
        { id: "3d", label: "近3日" },
        { id: "7d", label: "近7日" },
        { id: "1m", label: "近1月" },
        { id: "last-month", label: "上月" }
      ];
    }
    function dateInLedgerBoardRange(value) {
      const day = String(value || "").slice(0, 10);
      if (!day) return true;
      if (ui.ledgerBoardFrom && day < ui.ledgerBoardFrom) return false;
      if (ui.ledgerBoardTo && day > ui.ledgerBoardTo) return false;
      return true;
    }
    function ledgerBoardRangeText(records) {
      if (!records.length) return "无记录";
      const days = records.map(row => String(row.updatedAt || row.postedAt || "").slice(0, 10)).filter(Boolean).sort();
      if (!days.length) return "全部日期";
      return `${days[0]} 至 ${days[days.length - 1]}`;
    }
    function renderLedgers() {
      const definitions = ledgerCenterDefinitions();
      const activeDef = activeLedgerDefinition();
      if (activeDef.模块 && ui.ledgerTab !== activeDef.模块) ui.ledgerTab = activeDef.模块;
      const ledgerRows = ledgerCenterRecordsFor(activeDef);
      const auditRows = ledgerAuditRows(ledgerRows, activeDef);
      syncLedgerFilterOptions(auditRows);
      const rows = filteredRows(filterLedgerAuditRows(auditRows));
      return `
        ${renderPageHead("账本中心", `${definitions.length} 类会计审核账本，只保留资金影响和必要信用台账；凭证、映射、幂等和主档类转入下钻或配置。`, `
          <button class="btn" data-action="export-view">导出当前账本</button>
        `)}
        <div class="panel">
          <div class="panel-head">
            <div><h2 class="panel-title">${escapeHtml(activeDef.模块)}</h2><span class="panel-meta">${rows.length} / ${auditRows.length} 条账变记录</span></div>
            <span class="badge ${priorityTone(activeDef.priority)}">${escapeHtml(activeDef.priority)}</span>
          </div>
          <div class="panel-body ledger-list-filters">
            ${renderLedgerFilters(definitions, activeDef, auditRows)}
            ${renderLedgerDefinitionSummary(activeDef)}
            <div class="ledger-board-quick">
              ${ledgerBoardQuickButtons().map(item => `<button class="btn sm ${ui.ledgerBoardQuick === item.id ? "primary" : ""}" data-action="ledger-board-quick" data-range="${escapeAttr(item.id)}">${escapeHtml(item.label)}</button>`).join("")}
            </div>
            <div class="field compact"><label>开始日期</label><input id="ledgerBoardFrom" type="date" value="${escapeAttr(ui.ledgerBoardFrom)}"></div>
            <div class="field compact"><label>结束日期</label><input id="ledgerBoardTo" type="date" value="${escapeAttr(ui.ledgerBoardTo)}"></div>
            <button class="btn" data-action="clear-ledger-board-dates">清空日期</button>
          </div>
          <div class="locked-note">会计主界面只看“哪笔业务影响哪个账本、方向、金额、凭证号、核销状态和结账期间”。凭证批次/凭证明细、业务映射、幂等关联、账户主档保留在凭证中心、会计配置或详情审计追踪中。</div>
          ${renderTable({
            id: `ledger-${activeDef.模块}`,
            rows,
            columns: ["业务时间","业务单号","业务类型","影响账本","站点ID","站点名称","发起主体身份","发起主体ID","发起主体名称","方向","金额","前值","后值","凭证号","核销状态","结账期间","入账口径"],
            actions: row => renderLedgerRowActions(row, activeDef)
          })}
        </div>
      `;
    }
    function renderLedgerDefinitionSummary(def) {
      const chips = [
        ["账本性质", def.账本性质],
        ["业务主体", def.业务主体],
        ["当前落账", def.当前是否已落账],
        ["正式分录", def.是否正式分录],
        ["会计口径", ledgerAuditScope(def)],
        ["源表", def.源表 || def.建议表名],
        ["操作口径", def.操作口径]
      ];
      return `
        <div class="ledger-definition-summary">
          ${chips.map(([label, value]) => `
            <span class="ledger-definition-chip"><strong>${escapeHtml(label)}</strong>${escapeHtml(value || "-")}</span>
          `).join("")}
        </div>
      `;
    }
    function renderLedgerRowActions(row, def) {
      const recordId = row._recordId || row.id;
      const voucherNo = row._voucherNo || row.凭证号 || row.voucherNo;
      const actions = [`<button class="btn sm" data-action="detail-ledger" data-id="${escapeAttr(recordId)}">详情</button>`];
      if (voucherNo) actions.push(`<button class="btn sm" data-action="select-voucher" data-id="${escapeAttr(voucherNo)}">凭证下钻</button>`);
      if (canReverseLedgerRecord(def)) actions.push(`<button class="btn sm warn" data-action="request-ledger-reversal" data-id="${escapeAttr(recordId)}">发起冲正申请</button>`);
      return actions.join("");
    }
    function canEditLedgerRecord(def) {
      return def.是否可编辑 === "是";
    }
    function canReverseLedgerRecord(def) {
      return def.是否可冲正 === "是" && !/配置|映射|幂等|核销|迁移|正式凭证/.test(String(def.账本性质 || ""));
    }
    function voucherResultRows() {
      return accountingChangeRows(accountingEntryRows()).map(row => {
        const attribution = buildEntityAttribution({
          sourceId: row.sourceId,
          voucherNo: row.voucherNo,
          bizName: row.bizName,
          sourceTable: row.sourceTable,
          supplementLedger: row.supplementLedger,
          note: `${row.matrixAction || ""} ${row.gapId || ""}`
        }, JSON.stringify(row));
        return {
          _voucherNo: row.voucherNo,
          业务时间: row.postedAt,
          源业务单号: row.sourceId,
          业务类型: row.bizName,
          站点ID: attribution.站点ID,
          站点名称: attribution.站点名称,
          发起主体身份: attribution.initiatorType,
          发起主体ID: attribution.initiatorId,
          发起主体名称: attribution.initiatorName,
          代理ID: attribution.代理ID,
          代理名称: attribution.代理名称,
          会员ID: attribution.会员ID,
          会员名称: attribution.会员名称,
          凭证号: row.voucherNo,
          模板编码: row.templateCode,
          分录步骤: row.lineCount,
          正式分录行: row.formalLineCount,
          信用台账行: row.controlLineCount,
          借方金额: row.debit,
          贷方金额: row.credit,
          信用台账金额: row.controlAmount,
          借贷状态: Math.abs(Number(row.debit || 0) - Number(row.credit || 0)) < 0.01 ? "平衡" : "不平衡",
          对应账本: row.supplementLedger,
          核销关系: row.reconciliationKey,
          后端覆盖: row.matrixCoverage || row.status,
          缺口和补记建议: [row.gapId, row.matrixAction].filter(Boolean).join(" / ") || "正常入账"
        };
      });
    }
    function filterVoucherResultRows(rows) {
      return (rows || []).filter(row => {
        if (ui.entryBizTypeFilter && row.业务类型 !== ui.entryBizTypeFilter) return false;
        if (!rowMatchesEntityOption(row, "站点ID", "站点名称", ui.entrySiteFilter)) return false;
        if (ui.entryInitiatorTypeFilter && row.发起主体身份 !== ui.entryInitiatorTypeFilter) return false;
        if (!rowMatchesEntityOption(row, "发起主体ID", "发起主体名称", ui.entryInitiatorFilter)) return false;
        if (ui.entryVoucherFilter && row.凭证号 !== ui.entryVoucherFilter) return false;
        if (ui.entryTemplateFilter && row.模板编码 !== ui.entryTemplateFilter) return false;
        if (ui.entryBalanceStatusFilter && row.借贷状态 !== ui.entryBalanceStatusFilter) return false;
        if (ui.entryLedgerFilter && row.对应账本 !== ui.entryLedgerFilter) return false;
        if (ui.entryReconFilter && row.核销关系 !== ui.entryReconFilter) return false;
        if (ui.entryBackendFilter && row.后端覆盖 !== ui.entryBackendFilter) return false;
        return true;
      });
    }
    function currentVoucherResultRows() {
      return filteredRows(filterVoucherResultRows(voucherResultRows()));
    }
    function voucherResultFilterLabels() {
      return {
        业务类型: ui.entryBizTypeFilter || "全部",
        站点: ui.entrySiteFilter || "全部",
        发起主体身份: ui.entryInitiatorTypeFilter || "全部",
        发起主体: ui.entryInitiatorFilter || "全部",
        凭证号: ui.entryVoucherFilter || "全部",
        模板编码: ui.entryTemplateFilter || "全部",
        借贷状态: ui.entryBalanceStatusFilter || "全部",
        对应账本: ui.entryLedgerFilter || "全部",
        核销关系: ui.entryReconFilter || "全部",
        后端覆盖: ui.entryBackendFilter || "全部"
      };
    }
    function renderAccountingEntryFilters(sourceRows) {
      return `
        <div class="panel">
          <div class="panel-head">
            <div><h2 class="panel-title">分录筛选</h2><span class="panel-meta">按业务、主体、凭证、模板、借贷状态和账本过滤。</span></div>
            <button class="btn" data-action="clear-entry-filters">清空筛选</button>
          </div>
          <div class="panel-body filter-grid">
            ${renderReportSelect("entryBizTypeFilter", "业务类型", ui.entryBizTypeFilter, uniqueRowValues(sourceRows, "业务类型"))}
            ${renderReportSelect("entrySiteFilter", "站点", ui.entrySiteFilter, uniqueEntityOptions(sourceRows, "站点ID", "站点名称"))}
            ${renderReportSelect("entryInitiatorTypeFilter", "发起主体身份", ui.entryInitiatorTypeFilter, uniqueRowValues(sourceRows, "发起主体身份"))}
            ${renderReportSelect("entryInitiatorFilter", "发起主体", ui.entryInitiatorFilter, uniqueEntityOptions(sourceRows, "发起主体ID", "发起主体名称"))}
            ${renderReportSelect("entryVoucherFilter", "凭证号", ui.entryVoucherFilter, uniqueRowValues(sourceRows, "凭证号"))}
            ${renderReportSelect("entryTemplateFilter", "模板编码", ui.entryTemplateFilter, uniqueRowValues(sourceRows, "模板编码"))}
            ${renderReportSelect("entryBalanceStatusFilter", "借贷状态", ui.entryBalanceStatusFilter, uniqueRowValues(sourceRows, "借贷状态"))}
            ${renderReportSelect("entryLedgerFilter", "对应账本", ui.entryLedgerFilter, uniqueRowValues(sourceRows, "对应账本"))}
            ${renderReportSelect("entryReconFilter", "核销关系", ui.entryReconFilter, uniqueRowValues(sourceRows, "核销关系"))}
            ${renderReportSelect("entryBackendFilter", "后端覆盖", ui.entryBackendFilter, uniqueRowValues(sourceRows, "后端覆盖"))}
          </div>
        </div>
      `;
    }
    function renderAccountingEntries() {
      const sourceRows = voucherResultRows();
      const changeRows = filteredRows(filterVoucherResultRows(sourceRows));
      const stepCount = sum(changeRows, "分录步骤");
      const formalLineCount = sum(changeRows, "正式分录行");
      const creditLineCount = sum(changeRows, "信用台账行");
      const debit = sum(changeRows, "借方金额");
      const credit = sum(changeRows, "贷方金额");
      return `
        ${renderPageHead("会计分录报表", "按每笔业务展示分录记账结果、借方、贷方、信用台账和对应账本；完整分录行在凭证详情中查看。", `
          <button class="btn" data-action="export-view">导出会计分录报表</button>
        `)}
        <div class="metrics">
          ${metric("分录步骤", stepCount, "凭证详情中查看", "info")}
          ${metric("正式分录", formalLineCount, "资产/负债/收入/成本", "good")}
          ${metric("信用台账", creditLineCount, "900xxx 不进平衡", "warn")}
          ${metric("借方发生额", fmtMoney(debit), "正式分录", "info")}
          ${metric("贷方发生额", fmtMoney(credit), "正式分录", "info")}
          ${metric("借贷差", fmtMoney(Math.abs(debit - credit)), Math.abs(debit - credit) < 0.01 ? "当前筛选平衡" : "当前筛选差异", Math.abs(debit - credit) < 0.01 ? "good" : "bad")}
        </div>
        ${renderAccountingEntryFilters(sourceRows)}
        <div class="panel">
          <div class="panel-head"><h2 class="panel-title">每笔业务凭证结果</h2><span class="panel-meta">${changeRows.length} 笔账变 · 分录在凭证详情查看</span></div>
          ${renderTable({
            id: "accounting-entry-changes",
            rows: changeRows,
            columns: ["业务时间","源业务单号","业务类型","站点ID","站点名称","发起主体身份","发起主体ID","发起主体名称","凭证号","模板编码","分录步骤","正式分录行","信用台账行","借方金额","贷方金额","信用台账金额","借贷状态","对应账本","核销关系","后端覆盖","缺口和补记建议"],
            actions: row => `
              <button class="btn sm" data-action="detail-voucher" data-id="${escapeAttr(row._voucherNo)}">凭证详情</button>
            `
          })}
        </div>
      `;
    }
    function accountingEntryRows() {
      return state.voucherBatches.flatMap(batch => {
        const lines = batch.lines || [];
        const formalLines = lines.filter(line => line.formal && !String(line.subjectCode || "").startsWith("9"));
        return lines.map((line, index) => {
          const isFormal = Boolean(line.formal) && !String(line.subjectCode || "").startsWith("9");
          const amount = Number(line.amount || 0);
          const debitAmount = isFormal && line.direction === "借" ? amount : 0;
          const creditAmount = isFormal && line.direction === "贷" ? amount : 0;
          const controlChange = isFormal ? 0 : amount;
          const opposite = formalLines
            .filter(other => other.direction !== line.direction)
            .map(other => `${other.subjectCode} ${other.subjectName}`)
            .filter(Boolean)
            .join("；");
          const entryId = `${batch.voucherNo}-${String(line.lineNo || index + 1).padStart(3, "0")}`;
          return {
            entryId,
            postedAt: batch.postedAt || "",
            voucherNo: batch.voucherNo,
            sourceId: batch.sourceId || "",
            bizName: batch.bizName || businessNameFor(batch.templateCode),
            templateCode: batch.templateCode || "",
            ruleId: batch.ruleId || "",
            sourceTable: batch.sourceTable || line.source || "",
            sourceDoc: line.sourceDoc || batch.sourceDoc || batch.sourceTable || line.source || "",
            matrixAction: line.matrixAction || batch.matrixAction || "",
            matrixCoverage: line.matrixCoverage || batch.matrixCoverage || "",
            gapId: line.gapId || batch.gapId || "",
            supplementNote: line.supplementNote || batch.supplementNote || "",
            closeLoopKey: line.closeLoopKey || batch.closeLoopKey || "",
            closeLoopName: line.closeLoopName || batch.closeLoopName || "",
            supplementLedger: line.supplementLedger || batch.supplementLedger || "",
            reconciliationKey: line.reconciliationKey || batch.reconciliationKey || "",
            idempotencyKey: batch.idempotencyKey || line.idempotencyKey || "",
            status: batch.status || "",
            batchBalanced: batch.balanced ? "平衡" : "不平衡",
            entryKind: isFormal ? "正式分录" : "信用台账",
            entryStepNo: index + 1,
            entrySequenceNo: line.lineNo || index + 1,
            direction: line.direction || "",
            subjectCode: line.subjectCode || "",
            subjectName: line.subjectName || "",
            subjectType: line.subjectType || "",
            debitAmount,
            creditAmount,
            controlChange,
            amount,
            expression: line.expression || "",
            formal: isFormal,
            entity: line.entity || "",
            source: line.source || batch.sourceTable || "",
            sourceField: line.sourceField || "",
            relationText: isFormal
              ? `${line.direction}记 ${line.subjectCode} ${line.subjectName}，对应${line.direction === "借" ? "贷" : "借"}方：${opposite || "同凭证其他分录"}`
              : `${line.subjectCode} ${line.subjectName} ${line.direction || "信用"} ${fmtMoney(amount)}，不参与借贷平衡`,
            note: line.note || ""
          };
        });
      });
    }
    function accountingChangeRows(rows) {
      const map = new Map();
      rows.forEach(row => {
        const current = map.get(row.voucherNo) || {
          sourceId: row.sourceId,
          voucherNo: row.voucherNo,
          bizName: row.bizName,
          templateCode: row.templateCode,
          ruleId: row.ruleId,
          sourceTable: row.sourceTable,
          supplementLedger: row.supplementLedger,
          reconciliationKey: row.reconciliationKey,
          idempotencyKey: row.idempotencyKey,
          matrixAction: row.matrixAction,
          gapId: row.gapId,
          status: row.status,
          postedAt: row.postedAt,
          lineCount: 0,
          formalLineCount: 0,
          controlLineCount: 0,
          debit: 0,
          credit: 0,
          controlAmount: 0,
          subjects: new Set()
        };
        current.lineCount += 1;
        if (row.entryKind === "正式分录") {
          current.formalLineCount += 1;
          current.debit += Number(row.debitAmount || 0);
          current.credit += Number(row.creditAmount || 0);
        } else {
          current.controlLineCount += 1;
          current.controlAmount += Number(row.controlChange || 0);
        }
        if (row.subjectCode) current.subjects.add(`${row.subjectCode} ${row.subjectName}`);
        if (row.matrixAction && !String(current.matrixAction || "").includes(row.matrixAction)) current.matrixAction = [current.matrixAction, row.matrixAction].filter(Boolean).join("；");
        if (row.gapId && !String(current.gapId || "").includes(row.gapId)) current.gapId = [current.gapId, row.gapId].filter(Boolean).join("/");
        map.set(row.voucherNo, current);
      });
      return Array.from(map.values()).map(row => ({
        ...row,
        subjectSummary: Array.from(row.subjects).slice(0, 5).join("；")
      }));
    }
    function renderFinanceStats() {
      if (!financeStatTabs.includes(ui.financeStatTab)) ui.financeStatTab = financeStatTabs[0];
      const rows = financeStatRows(ui.financeStatTab);
      const amount = sum(rows, "金额") || sum(rows, "净变动") || sum(rows, "余额");
      const pending = rows.filter(row => /待|差异|异常|未/.test(JSON.stringify(row))).length;
      return `
        ${renderPageHead("财务统计", "按正式借贷、信用台账、来源字段三类口径统计官方账户、三方清算、待付待领、奖励成本、月结、场馆和游戏。", `
          <button class="btn" data-action="export-view">导出统计</button>
        `)}
        <div class="panel">
          <div class="panel-body ledger-list-filters">
            <div class="field compact"><label>开始日期</label><input id="financeStatFrom" type="date" value="${escapeAttr(ui.financeStatFrom)}"></div>
            <div class="field compact"><label>结束日期</label><input id="financeStatTo" type="date" value="${escapeAttr(ui.financeStatTo)}"></div>
            ${renderReportSelect("financeStatEntityTypeFilter", "发起主体身份", ui.financeStatEntityTypeFilter, ["总站", "站点", "代理", "会员", "三方", "场馆", "系统"])}
            <div class="field compact"><label>站点搜索</label><input id="financeStatSiteSearch" type="search" value="${escapeAttr(ui.financeStatSiteSearch)}" placeholder="站点ID或名称"></div>
            <div class="field compact"><label>发起主体搜索</label><input id="financeStatInitiatorSearch" type="search" value="${escapeAttr(ui.financeStatInitiatorSearch)}" placeholder="代理、会员、站点"></div>
            <div class="field compact"><label>主体/通道/账本</label><input id="financeStatSubject" type="search" value="${escapeAttr(ui.financeStatSubject)}" placeholder="站点、代理、会员、三方、官方账户"></div>
            ${renderReportSelect("financeStatBizTypeFilter", "业务类型", ui.financeStatBizTypeFilter, financeStatFilterValues("业务类型"))}
            ${renderReportSelect("financeStatSubjectTypeFilter", "科目类型", ui.financeStatSubjectTypeFilter, financeStatFilterValues("科目类型"))}
            ${renderReportSelect("financeStatStatusFilter", "状态", ui.financeStatStatusFilter, financeStatFilterValues("状态"))}
            <button class="btn" data-action="clear-finance-stat-filters">清空筛选</button>
          </div>
        </div>
        ${renderTabs(financeStatTabs, ui.financeStatTab, "finance-stat-tab")}
        <div class="metrics">
          ${metric("统计行数", rows.length, "当前筛选结果", "info")}
          ${metric("金额合计", fmtMoney(amount), "按当前页签口径", "good")}
          ${metric("待处理/差异", pending, "含待清算、差异、异常", pending ? "warn" : "good")}
          ${metric("统计期间", financeStatRangeText(), "原型凭证与账本数据", "info")}
        </div>
        <div class="panel">
          <div class="panel-head"><h2 class="panel-title">${escapeHtml(ui.financeStatTab)}</h2><span class="panel-meta">${rows.length} 条</span></div>
          ${renderTable({
            id: `finance-stat-${ui.financeStatTab}`,
            rows,
            columns: preferredFinanceStatColumns(ui.financeStatTab, rows),
            actions: row => (row._voucherNo || row.voucherNo || row.凭证号) ? `<button class="btn sm" data-action="detail-voucher" data-id="${escapeAttr(row._voucherNo || row.voucherNo || row.凭证号)}">凭证详情</button>` : ""
          })}
        </div>
      `;
    }

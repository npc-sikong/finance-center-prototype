"use strict";

const LS_KEY = "financeCenterDemoState.v14";
const LEGACY_LS_KEYS = ["financeCenterDemoState.v13", "financeCenterDemoState.v12", "financeCenterDemoState.v11", "financeCenterDemoState.v10", "financeCenterDemoState.v9", "financeCenterDemoState.v8", "financeCenterDemoState.v7", "financeCenterDemoState.v6", "financeCenterDemoState.v5"];
    const excel = window.FINANCE_EXCEL_DATA;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const ui = {
      module: "dashboard",
      configSheet: "会计模板",
      ledgerTab: "",
      reportTab: "资产负债",
      financeStatTab: "统计总览",
      table: {},
      globalSearch: "",
      priority: "",
      status: "",
      selectedVoucher: "",
      templateEditCode: "",
      templateEntryEditId: "",
      ledgerBoardFrom: "",
      ledgerBoardTo: "",
      ledgerBoardQuick: "",
      ledgerSubjectFilter: "",
      ledgerBusinessEntityFilter: "",
      ledgerBizTypeFilter: "",
      ledgerDirectionFilter: "",
      ledgerReconStatusFilter: "",
      ledgerPostingScopeFilter: "",
      businessFundingSiteFilter: "",
      businessFundingInitiatorTypeFilter: "",
      businessFundingInitiatorFilter: "",
      businessFundingBizTypeFilter: "",
      businessFundingDirectionFilter: "",
      businessFundingVoucherStatusFilter: "",
      businessFundingReconStatusFilter: "",
      businessFundingBackendStatusFilter: "",
      entrySiteFilter: "",
      entryInitiatorTypeFilter: "",
      entryInitiatorFilter: "",
      entryBizTypeFilter: "",
      entryVoucherFilter: "",
      entryTemplateFilter: "",
      entryBalanceStatusFilter: "",
      entryLedgerFilter: "",
      entryReconFilter: "",
      entryBackendFilter: "",
      reconciliationSiteFilter: "",
      reconciliationInitiatorTypeFilter: "",
      reconciliationInitiatorFilter: "",
      reconciliationObjectFilter: "",
      reconciliationSourceDocFilter: "",
      reconciliationRelationFilter: "",
      reconciliationStatusFilter: "",
      reconciliationVoucherFilter: "",
      reconciliationLedgerFilter: "",
      reconciliationBackendFilter: "",
      reportFrom: "",
      reportTo: "",
      reportEntityTypeFilter: "",
      reportEntitySearch: "",
      reportSiteSearch: "",
      reportInitiatorSearch: "",
      reportSubjectTypeFilter: "",
      reportSubjectSearch: "",
      reportDirectionFilter: "",
      reportBizTypeFilter: "",
      reportReconStatusFilter: "",
      reportBackendStatusFilter: "",
      financeStatFrom: "",
      financeStatTo: "",
      financeStatSubject: "",
      financeStatEntityTypeFilter: "",
      financeStatSiteSearch: "",
      financeStatInitiatorSearch: "",
      financeStatBizTypeFilter: "",
      financeStatSubjectTypeFilter: "",
      financeStatStatusFilter: "",
      sidebarOpen: false
    };

    const sample = {
      G: 1000,
      F: 30,
      A: 970,
      W: 500,
      N: 470,
      bonus: 88,
      commission: 120,
      OF: 35,
      prepaid: 600,
      frozen: 400,
      refund: 50,
      VF: 60,
      rent: 200,
      siteShare: 300,
      mainShare: 700,
      settle: 900,
      gameAmount: 500
    };

    const sheetMap = {
      subjects: "会计科目表",
      events: "业务事件清单",
      templates: "会计模板",
      entries: "会计分录",
      systemMap: "系统账变映射",
      risks: "差异与风险清单",
      requirements: "财务补全开发需求",
      ledgerDefinitions: "账本表结构设计",
      voucherRules: "凭证生成规则",
      businessRules: "业务逻辑规则",
      stateMachine: "状态机定义",
      mappingRows: "业务映射矩阵",
      reconciliationRules: "核销关系设计",
      acceptanceItems: "开发验收清单",
      checks: "检查表",
      actionOverview: "动作总览",
      fundImpactDetails: "资金影响明细",
      fundModuleDict: "资金模块字典",
      gapConfirmations: "缺口与待确认",
      closeLoopChains: "做账闭环链路",
      closeLoopControl: "闭环总控"
    };

    const configGroups = [
      {
        id: "base",
        label: "基础会计配置",
        desc: "资金账变入账所需的最小会计规则。",
        sheets: ["会计科目表", "科目编码", "会计模板", "会计分录", "凭证生成规则"]
      }
    ];

    const configSheets = configGroups.flatMap(group => group.sheets);



    function loadState() {
      const fresh = createInitialState();
      try {
        const saved = migrateCreditWording(readSavedState());
        if (!saved) return fresh;
        const keepGenerated = saved.version === 14;
        const voucherBatches = keepGenerated ? repairVoucherBatches(saved.voucherBatches || fresh.voucherBatches, fresh.voucherBatches) : fresh.voucherBatches;
        return {
          ...fresh,
          subjects: mergeSubjects(fresh.subjects, saved.subjects || []),
          templates: saved.templates || fresh.templates,
          entries: (saved.entries || fresh.entries).map(normalizeEntryRow),
          voucherRules: saved.voucherRules || fresh.voucherRules,
          risks: mergeByKey(fresh.risks, saved.risks || [], "风险编号"),
          acceptanceItems: mergeByKey(fresh.acceptanceItems, saved.acceptanceItems || [], "开发项"),
          voucherBatches,
          ledgerRecords: keepGenerated ? (saved.ledgerRecords || fresh.ledgerRecords) : fresh.ledgerRecords,
          reconciliationRecords: keepGenerated ? (saved.reconciliationRecords || fresh.reconciliationRecords) : fresh.reconciliationRecords,
          auditTrail: saved.auditTrail || fresh.auditTrail
        };
      } catch (error) {
        console.warn(error);
        return fresh;
      }
    }

    function readSavedState() {
      const current = localStorage.getItem(LS_KEY);
      if (current) return JSON.parse(current);
      for (const key of LEGACY_LS_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) return JSON.parse(legacy);
      }
      return null;
    }

    function migrateCreditWording(value) {
      const oldWord = String.fromCharCode(0x63A7, 0x5236);
      const oldMatrixWord = String.fromCharCode(67, 70, 79);
      const oldLeaderWord = "财务" + "总监";
      if (typeof value === "string") {
        return value
          .split(oldWord).join("信用")
          .replace(new RegExp(`${oldMatrixWord}动作矩阵`, "g"), "账变影响数据")
          .replace(new RegExp(`${oldMatrixWord}矩阵`, "g"), "账变影响数据")
          .replace(new RegExp(`${oldMatrixWord}补全范围`, "g"), "补全范围")
          .replace(new RegExp(`${oldMatrixWord}显示口径`, "g"), "显示口径")
          .replace(new RegExp(oldLeaderWord, "g"), "财务")
          .replace(new RegExp(`\\b${oldMatrixWord}\\b`, "g"), "资金账变")
          .replace(/闭环总控底账/g, "入账追踪底账")
          .replace(/补齐原型闭环/g, "补齐入账链路")
          .replace(/原型闭环已补齐/g, "原型入账已补齐")
          .replace(/原型已闭环/g, "原型已补齐")
          .replace(/业务闭环/g, "入账链路")
          .replace(/期间结账/g, "报表统计");
      }
      if (Array.isArray(value)) return value.map(migrateCreditWording);
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [migrateCreditWording(key), migrateCreditWording(item)]));
      }
      return value;
    }

    function saveState() {
      localStorage.setItem(LS_KEY, JSON.stringify({
        version: 14,
        subjects: state.subjects,
        templates: state.templates,
        entries: state.entries,
        voucherRules: state.voucherRules,
        risks: state.risks,
        acceptanceItems: state.acceptanceItems,
        voucherBatches: state.voucherBatches,
        ledgerRecords: state.ledgerRecords,
        reconciliationRecords: state.reconciliationRecords,
        auditTrail: state.auditTrail
      }));
    }

    function createInitialState() {
      const subjects = data("subjects").map(normalizeSubject);
      const subjectByCode = subjectLookup(subjects);
      const templates = data("templates");
      const entries = data("entries").map(normalizeEntryRow);
      const voucherRules = data("voucherRules");
      const ledgerDefinitions = buildLedgerDefinitions(data("ledgerDefinitions"));
      const voucherBatches = seedVouchers(subjectByCode, entries, voucherRules);
      const closeLoopControl = data("closeLoopControl");
      const ledgerRecords = [
        ...seedLedgerRecords(ledgerDefinitions, voucherBatches),
        ...seedCloseLoopLedgerRecords(closeLoopControl, ledgerDefinitions, voucherBatches)
      ];
      const reconciliationRecords = [
        ...seedReconciliationRecords(),
        ...seedCloseLoopReconciliationRecords(closeLoopControl, voucherBatches)
      ];
      return {
        version: 14,
        generatedAt: excel._meta.generatedAt,
        actionOverview: data("actionOverview"),
        fundImpactDetails: data("fundImpactDetails"),
        fundModuleDict: data("fundModuleDict"),
        gapConfirmations: data("gapConfirmations"),
        closeLoopChains: data("closeLoopChains"),
        closeLoopControl,
        subjects,
        risks: data("risks").map((row, index) => ({
          ...row,
          uiStatus: riskClosedLoopStatus(row.风险编号 || row.gapId || "", index),
          priority: requirementForRisk(row.风险编号)?.优先级 || priorityByIndex(index)
        })),
        requirements: data("requirements"),
        templates,
        entries,
        ledgerDefinitions,
        voucherRules,
        businessRules: data("businessRules"),
        stateMachine: data("stateMachine"),
        mappingRows: data("mappingRows"),
        reconciliationRules: data("reconciliationRules"),
        acceptanceItems: data("acceptanceItems").map((row, index) => ({
          ...row,
          uiStatus: row.状态 && row.状态 !== "待开发" ? row.状态 : acceptanceClosedLoopStatus(row, index),
          progress: acceptanceClosedLoopProgress(row, index)
        })),
        voucherBatches,
        ledgerRecords,
        reconciliationRecords,
        auditTrail: [
          { time: now(-180), actor: "系统", action: "导入账变影响数据", target: "动作50 / 影响177 / GAP15", result: "已生成资金影响、凭证和账本底账" },
          { time: now(-120), actor: "财务", action: "补齐入账链路", target: "源单 -> 凭证 -> 分录 -> 账本 -> 报表", result: "原型入账已补齐，后端落地状态仅作追踪" },
          { time: now(-60), actor: "系统", action: "初始化记账工作台", target: "业务资金明细 / 账本 / 凭证 / 核销", result: "已按实际业务资金变动重新规划" }
        ]
      };
    }

    function buildLedgerDefinitions(rows) {
      const overrides = ledgerDefinitionOverrides();
      const baseRows = rows.map((row, index) => {
        const override = overrides[row.模块] || overrides[row.建议表名] || {};
        return normalizeLedgerDefinition({ ...row, ...override }, index);
      });
      const existing = new Set(baseRows.map(row => row.建议表名));
      const additions = supplementalLedgerDefinitions()
        .filter(row => !existing.has(row.建议表名))
        .map((row, index) => normalizeLedgerDefinition(row, baseRows.length + index));
      return [...baseRows, ...additions];
    }

    function normalizeLedgerDefinition(row, index) {
      const tableName = row.建议表名 || row.源表 || `ledger_${index + 1}`;
      const nature = row.账本性质 || ledgerNatureByText(`${row.模块 || ""} ${tableName} ${row.开发说明 || ""}`);
      const isControl = row.是否控制台账 || (/控制|信用|配置|映射|迁移|幂等|核销/.test(nature) ? "是" : "否");
      const isFormal = row.是否正式分录 || (isControl === "是" ? "否" : "是");
      return {
        ...row,
        priority: row.优先级 || row.priority || priorityByIndex(index),
        模块: row.模块 || `账本${index + 1}`,
        建议表名: tableName,
        源表: row.源表 || tableName,
        账本性质: nature,
        业务主体: row.业务主体 || ledgerEntityByText(`${row.模块 || ""} ${row.开发说明 || ""}`),
        当前是否已落账: row.当前是否已落账 || "原型已闭环，后端待落地",
        是否正式分录: isFormal,
        是否控制台账: isControl,
        是否可冲正: row.是否可冲正 || (isFormal === "是" ? "是" : "否"),
        是否可编辑: row.是否可编辑 || (/配置|映射/.test(nature) ? "是" : "否"),
        展示分组: row.展示分组 || ledgerGroupByText(`${row.模块 || ""} ${tableName} ${row.开发说明 || ""}`),
        操作口径: row.操作口径 || ledgerOperationPolicy(nature, isFormal, isControl),
        正确口径: row.正确口径 || row.开发说明 || "",
        验收口径: row.验收口径 || "源单、凭证、账本、核销关系可互相追溯"
      };
    }

    function ledgerNatureByText(text) {
      if (/账户主档|配置|映射/.test(text)) return "系统映射配置";
      if (/幂等|核销/.test(text)) return "核销关联控制台账";
      if (/额度|信用|预付|快照/.test(text)) return "信用台账";
      if (/迁移|老佣金/.test(text)) return "历史迁移台账";
      if (/凭证批次|凭证明细|accounting_voucher/.test(text)) return "正式凭证账本";
      return "正式资金账本";
    }

    function ledgerEntityByText(text) {
      if (/会员|代理/.test(text)) return "会员/代理";
      if (/站点|总站/.test(text)) return "总站/站点";
      if (/三方|手续费|通道/.test(text)) return "三方通道";
      if (/场馆|游戏/.test(text)) return "会员/场馆";
      if (/红包|奖励|费用/.test(text)) return "会员/站点/代理";
      return "系统";
    }

    function ledgerGroupByText(text) {
      if (/现金|官方|三方|手续费|清算|fee|channel/.test(text)) return "现金与三方清算";
      if (/预付|prepaid/.test(text)) return "预付金与外部结算";
      if (/红包|奖励|费用|快照|red_packet|reward|expense/.test(text)) return "红包与奖励费用";
      if (/佣金|月结|commission|monthly/.test(text)) return "佣金与月结";
      if (/场馆|游戏|venue|game|wallet/.test(text)) return "场馆与游戏";
      if (/凭证|映射|幂等|核销|voucher|mapping|idempotency|reconciliation/.test(text)) return "凭证与核销";
      if (/余额|额度|调账|转账|fund_pool|member_account|quota/.test(text)) return "主体余额与额度";
      return "凭证与核销";
    }

    function ledgerOperationPolicy(nature, isFormal, isControl) {
      if (/配置|映射/.test(nature)) return "配置维护，不做账变冲正";
      if (/迁移/.test(nature)) return "迁移校验和重复检查，只读查看";
      if (/凭证明细|凭证账本/.test(nature)) return "通过原业务或冲正凭证处理，不直接改分录";
      if (/核销|幂等/.test(nature)) return "查看和核对关联关系，不直接改金额";
      if (isControl === "是" && isFormal !== "是") return "查看、导出和核对，不参与借贷平衡";
      return "查看、导出，按原业务生成冲正";
    }

    function data(key) {
      if (window.state && ["templates", "entries", "voucherRules"].includes(key) && Array.isArray(window.state[key])) {
        return window.state[key];
      }
      return migrateCreditWording(excel[sheetMap[key]] || []);
    }

    function normalizeSubject(row, index = 0) {
      const originalCode = String(row.原始科目编码 || row.科目编码 || "");
      const currentCode = String(row.科目编码 || originalCode);
      const productionControl = row.生产控制要求 || row.生产信用要求 || "";
      return {
        ...row,
        subjectId: row.subjectId || `SUBJ-${String(index + 1).padStart(3, "0")}`,
        原始科目编码: originalCode,
        科目编码: currentCode,
        生产控制要求: productionControl,
        编码状态: row.编码状态 || (currentCode === originalCode ? "原始" : "已调整"),
        编码更新时间: row.编码更新时间 || ""
      };
    }

    function normalizeEntryRow(row, index = 0) {
      return {
        ...row,
        entryLineId: row.entryLineId || `ENTRY-${String(index + 1).padStart(4, "0")}`
      };
    }

    function mergeSubjects(base, overlay) {
      const savedRows = overlay || [];
      const byId = new Map(savedRows.map(row => [row.subjectId || row.科目名称, row]));
      const byName = new Map(savedRows.map(row => [row.科目名称, row]));
      return base.map((row, index) => {
        const saved = byId.get(row.subjectId) || byName.get(row.科目名称);
        if (!saved) return row;
        return normalizeSubject({
          ...row,
          科目编码: saved.科目编码 || row.科目编码,
          编码状态: saved.编码状态,
          编码更新时间: saved.编码更新时间
        }, index);
      });
    }

    function subjectLookup(subjects) {
      return Object.fromEntries((subjects || []).flatMap(row => {
        const entries = [];
        if (row.原始科目编码) entries.push([String(row.原始科目编码), row]);
        if (row.科目编码) entries.push([String(row.科目编码), row]);
        return entries;
      }));
    }

    function subjectInfoByCode(code) {
      return subjectLookup(state.subjects)[String(code)] || {};
    }

    function currentSubjectCode(code) {
      return subjectInfoByCode(code).科目编码 || String(code || "");
    }

    function mergeByKey(base, overlay, key) {
      const map = new Map(overlay.map(row => [row[key], row]));
      return base.map(row => ({ ...row, ...(map.get(row[key]) || {}) }));
    }

    function priorityByIndex(index) {
      if (index < 8) return "P0";
      if (index < 14) return "P1";
      return "P2";
    }

    function riskClosedLoopStatus(riskId, index) {
      const row = closeLoopControlForRisk(riskId, index);
      if (!row) return index < 8 ? "后端待落地" : "需确认";
      if (row.闭环分类 === "仍需确认") return "需确认";
      if (row.闭环分类 === "原型已闭环") return "原型已闭环";
      return "后端待落地";
    }

    function acceptanceClosedLoopStatus(row, index) {
      const linked = closeLoopControlForRisk(row.风险编号 || row.gapId || "", index);
      if (!linked) return index < 7 ? "后端待落地" : "评审中";
      if (linked.闭环分类 === "仍需确认") return "需确认";
      return "原型已验收，后端待落地";
    }

    function acceptanceClosedLoopProgress(row, index) {
      const linked = closeLoopControlForRisk(row.风险编号 || row.gapId || "", index);
      if (!linked) return index < 7 ? 70 : 55;
      if (linked.闭环分类 === "仍需确认") return 60;
      return 85;
    }

    function closeLoopControlForRisk(riskId, index = 0) {
      const rows = data("closeLoopControl");
      const normalizedId = String(riskId || "");
      const direct = rows.find(row => normalizedId.includes(row.缺口编号) || normalizeText(JSON.stringify(row)).includes(normalizeText(normalizedId)));
      if (direct) return direct;
      return rows[index % Math.max(rows.length, 1)];
    }

    function requirementForRisk(riskId) {
      return data("requirements").find(row => row.风险编号 === riskId);
    }

    function seedVouchers(subjectByCode, entryRows = data("entries"), ruleRows = data("voucherRules")) {
      const entries = entryRows;
      return ruleRows.map((rule, index) => {
        const codes = resolveTemplateCodes(rule.关联模板);
        const mapping = mappingFor(rule.关联模板);
        const closeLoop = closeLoopForTemplate(rule.关联模板);
        const lines = entries
          .filter(row => templateMatches(row.模板编码, codes))
          .slice(0, 18)
          .map((row, lineIndex) => makeVoucherLine(row, lineIndex, subjectByCode));
        const fallbackLines = parseRuleLines(rule, subjectByCode);
        const rulePostsFormal = String(rule.是否正式制证 || "是") !== "否";
        const sourceLines = lines.length ? lines : fallbackLines;
        const batchLines = rulePostsFormal ? sourceLines : sourceLines.map(line => ({
          ...line,
          direction: inferControlDirection(`${line.note || ""} ${line.direction || ""} ${line.expression || ""}`),
          formal: false,
          note: [line.note, "非独立制证规则，仅作来源、信用或核销追踪"].filter(Boolean).join("；")
        }));
        const amounts = summarizeLines(batchLines);
        const voucherNo = `VCH-${String(index + 1).padStart(4, "0")}`;
        return {
          id: `batch-${index + 1}`,
          voucherNo,
          ruleId: rule.规则ID || `RULE-${index + 1}`,
          templateCode: rule.关联模板 || "",
          sourceId: `SRC-${String(2036000 + index)}`,
          bizName: businessNameFor(rule.关联模板),
          status: index % 7 === 0 ? "待复核" : "已入账",
          postedAt: now(-index * 7),
          sourceTable: mapping?.源表 || closeLoop?.业务源单 || "demo_source",
          sourceDoc: closeLoop?.业务源单 || mapping?.源表 || "demo_source",
          matrixAction: matrixActionForTemplate(rule.关联模板),
          matrixCoverage: matrixCoverageForTemplate(rule.关联模板),
          gapId: gapForTemplate(rule.关联模板),
          supplementNote: supplementForTemplate(rule.关联模板),
          closeLoopKey: closeLoop?.链路类型 || "",
          closeLoopName: closeLoop?.链路名称 || "",
          supplementLedger: closeLoop?.补记账本 || mapping?.["补充表/账本"] || "",
          reconciliationKey: closeLoop?.核销关系 || mapping?.核销对象 || "",
          idempotencyKey: [mapping?.源表 || closeLoop?.业务源单 || "demo_source", `SRC-${String(2036000 + index)}`, rule.关联模板 || ""].join(" + "),
          debit: amounts.debit,
          credit: amounts.credit,
          controlAmount: amounts.control,
          balanced: Math.abs(amounts.debit - amounts.credit) < 0.01,
          lines: batchLines,
          rule
        };
      });
    }

    function resolveTemplateCodes(value) {
      return String(value || "")
        .split(/[\/;,，、；]/)
        .map(code => code.trim())
        .filter(Boolean);
    }

    function templateMatches(templateCode, codes) {
      if (!templateCode || !codes.length) return false;
      return codes.some(code => {
        if (code.includes("*")) {
          const pattern = `^${String(code).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`;
          return new RegExp(pattern).test(String(templateCode));
        }
        return String(templateCode) === code || String(templateCode).startsWith(code.replace(/-\*$/, ""));
      });
    }

    function makeVoucherLine(row, index, subjectByCode) {
      const sourceCode = String(row.科目编码 || "");
      const subject = subjectByCode[sourceCode] || {};
      const subjectCode = subject.科目编码 || sourceCode;
      const isControl = subjectCode.startsWith("9") || row.是否正式分录 === "否";
      const direction = normalizeDirection(row["借贷/信用方向"], isControl);
      const amount = evaluateAmount(row.金额表达式);
      return {
        lineNo: Number(row.行号 || index + 1),
        direction,
        subjectCode,
        subjectName: row.科目名称 || subject.科目名称 || "",
        subjectType: row.科目类型 || subject.科目类型 || "",
        amount,
        expression: row.金额表达式 || "",
        entity: row.主体 || "",
        source: row.源表 || "",
        sourceField: row.源字段 || "",
        formal: !isControl && row.是否正式分录 !== "否",
        note: row.备注 || row.当前系统事实 || "",
        matrixAction: row.matrixAction || "",
        matrixCoverage: row.matrixCoverage || "",
        gapId: gapForTemplate(row.模板编码),
        supplementNote: row.supplementNote || "",
        closeLoopKey: row.closeLoopKey || "",
        closeLoopName: row.closeLoopName || "",
        sourceDoc: row.sourceDoc || row.源表 || "",
        supplementLedger: row.supplementLedger || "",
        reconciliationKey: row.reconciliationKey || "",
        idempotencyKey: row.idempotencyKey || ""
      };
    }

    function parseRuleLines(rule, subjectByCode) {
      const legacyCreditLedgerKey = "信用" + "台账行";
      const chunks = [rule.借方行 || "", rule.贷方行 || "", rule.信用台账行 || rule[legacyCreditLedgerKey] || ""];
      const directions = ["借", "贷", ""];
      return chunks.flatMap((chunk, chunkIndex) => String(chunk).split(/[；;]/).map((part, index) => {
        const code = (part.match(/([1-9]\d{5})/) || [])[1] || "";
        const expression = (part.match(/\b(G|F|A|W|N|bonus|prepaid|frozen|refund|OF|VF|rent|siteShare|mainShare|settle|commission|gameAmount)\b/i) || [])[1] || "W";
        const subject = subjectByCode[code] || {};
        const direction = directions[chunkIndex] || inferControlDirection(part);
        const subjectCode = subject.科目编码 || code || (direction === "信用" ? "900101" : "");
        return {
          lineNo: chunkIndex * 10 + index + 1,
          direction,
          subjectCode,
          subjectName: subject.科目名称 || part.trim(),
          subjectType: subject.科目类型 || (direction === "信用" ? "信用类" : ""),
          amount: evaluateAmount(expression),
          expression,
          entity: "",
          source: "",
          sourceField: "",
          formal: direction !== "信用" && !String(subjectCode || "").startsWith("9"),
          note: part.trim()
        };
      }).filter(line => line.note));
    }

    function normalizeDirection(value, isControl = false) {
      const text = String(value || "");
      if (!isControl) {
        if (text.includes("贷")) return "贷";
        return "借";
      }
      if (text.includes("减少") && text.includes("解锁")) return "减少/解锁";
      if (text.includes("增加") && text.includes("锁定")) return "增加/锁定";
      if (text.includes("减少") || text.includes("解锁")) return "减少";
      if (text.includes("增加") || text.includes("锁定")) return "增加";
      if (text.includes("引用")) return "引用";
      if (text.includes("状态")) return "状态变更";
      if (text.includes("核对") || text.includes("对账")) return "核对";
      return "信用";
    }

    function inferControlDirection(value) {
      const text = String(value || "");
      if (/按.*(增减|变动)/.test(text)) return "信用";
      if (/[+＋]\s*(G|F|A|W|N|bonus|prepaid|frozen|refund|OF|VF|rent|siteShare|mainShare|settle|commission|gameAmount)\b/i.test(text)) return "增加";
      if (/[-－]\s*(G|F|A|W|N|bonus|prepaid|frozen|refund|OF|VF|rent|siteShare|mainShare|settle|commission|gameAmount)\b/i.test(text)) return "减少";
      if (/减少|扣减|冲减|退回|归零/.test(text) && /解锁/.test(text)) return "减少/解锁";
      if (/减少|扣减|冲减|退回|归零|解锁/.test(text)) return "减少";
      if (/增加/.test(text) && /锁定|冻结/.test(text)) return "增加/锁定";
      if (/增加|锁定|冻结/.test(text)) return "增加";
      if (/引用/.test(text)) return "引用";
      if (/状态/.test(text)) return "状态变更";
      if (/核对|对账/.test(text)) return "核对";
      return "信用";
    }

    function repairVoucherBatches(batches, freshBatches) {
      const freshDirections = new Map();
      (freshBatches || []).forEach(batch => (batch.lines || []).forEach(line => {
        freshDirections.set(voucherLineKey(batch.voucherNo, line), line.direction);
      }));
      return (batches || []).map(batch => {
        const lines = (batch.lines || []).map(line => {
          const isControl = !line.formal || String(line.subjectCode || "").startsWith("9");
          if (!isControl) return line;
          const key = voucherLineKey(batch.voucherNo, line);
          const direction = freshDirections.get(key) || inferControlDirection(`${line.note || ""} ${line.expression || ""} ${line.direction || ""}`);
          return { ...line, direction, formal: false };
        });
        const amounts = summarizeLines(lines);
        return {
          ...batch,
          lines,
          debit: amounts.debit,
          credit: amounts.credit,
          controlAmount: amounts.control,
          balanced: Math.abs(amounts.debit - amounts.credit) < 0.01
        };
      });
    }

    function voucherLineKey(voucherNo, line) {
      return [voucherNo || "", line.lineNo || "", line.subjectCode || "", line.expression || "", line.note || ""].join("|");
    }

    function evaluateAmount(expression) {
      const expr = String(expression || "").trim();
      if (!expr || expr === "-") return 0;
      if (Object.prototype.hasOwnProperty.call(sample, expr)) return sample[expr];
      const replaced = expr.replace(/\b(G|F|A|W|N|bonus|prepaid|frozen|refund|OF|VF|rent|siteShare|mainShare|settle|commission|gameAmount)\b/g, token => Number(sample[token] || 0));
      if (/^[\d+\-*/().\s]+$/.test(replaced)) {
        try {
          const value = Function(`"use strict"; return (${replaced});`)();
          if (Number.isFinite(value)) return value;
        } catch (error) {}
      }
      const match = expr.match(/G|F|A|W|N|bonus|prepaid|frozen|refund|OF|VF|rent|siteShare|mainShare|settle|commission|gameAmount/);
      return match ? sample[match[0]] : sample.W;
    }

    function summarizeLines(lines) {
      return lines.reduce((acc, line) => {
        if (!line.formal) {
          acc.control += Number(line.amount || 0);
        } else if (line.direction === "借") {
          acc.debit += Number(line.amount || 0);
        } else if (line.direction === "贷") {
          acc.credit += Number(line.amount || 0);
        }
        return acc;
      }, { debit: 0, credit: 0, control: 0 });
    }

    function businessNameFor(templateCode) {
      const codes = resolveTemplateCodes(templateCode);
      const hit = data("templates").find(row => codes.some(code => templateMatches(row.模板编码, [code])));
      return hit?.业务名称 || hit?.模板编码 || templateCode || "演示业务";
    }

    function mappingFor(templateCode) {
      const codes = resolveTemplateCodes(templateCode);
      return data("mappingRows").find(row => templateMatches(row.模板编码, codes));
    }

    function closeLoopForTemplate(templateCode) {
      const codes = resolveTemplateCodes(templateCode);
      return data("closeLoopChains").find(row => templateMatches(row.关联模板, codes));
    }

    function templateRowsFor(templateCode) {
      const codes = resolveTemplateCodes(templateCode);
      return data("templates").filter(row => codes.some(code => templateMatches(row.模板编码, [code])));
    }

    function matrixActionForTemplate(templateCode) {
      const actions = templateRowsFor(templateCode).map(row => row.matrixAction).filter(Boolean);
      return Array.from(new Set(actions)).join("；");
    }

    function matrixCoverageForTemplate(templateCode) {
      const coverage = templateRowsFor(templateCode).map(row => row.matrixCoverage || row.覆盖状态).filter(Boolean);
      return Array.from(new Set(coverage)).join("；");
    }

    function supplementForTemplate(templateCode) {
      const notes = templateRowsFor(templateCode).map(row => row.supplementNote || row.补记建议).filter(Boolean);
      return Array.from(new Set(notes)).slice(0, 2).join("；");
    }

    function gapForTemplate(templateCode) {
      const text = `${matrixActionForTemplate(templateCode)} ${supplementForTemplate(templateCode)} ${templateCode}`;
      const hits = stateRows("gapConfirmations");
      return hits.filter(row => normalizeText(text).includes(normalizeText(row["缺口/待确认"])) || normalizeText(row.影响动作).split("、").some(part => part && normalizeText(text).includes(part))).map(row => row.编号).filter(Boolean).slice(0, 2).join("/");
    }

    function ledgerCoverageFor(def) {
      const text = normalizeText(`${def.模块} ${def.建议表名} ${def["影响科目/台账"]} ${def.开发说明}`);
      const hit = stateRows("fundImpactDetails").find(row => text.includes(normalizeText(row.资金模块)) || text.includes(normalizeText(row["表/字段"])));
      return hit?.覆盖程度 || def.优先级 || "";
    }

    function ledgerGapFor(def) {
      const text = normalizeText(`${def.模块} ${def.建议表名} ${def["影响科目/台账"]} ${def.开发说明}`);
      return stateRows("gapConfirmations").filter(row => text.includes(normalizeText(row.建议)) || text.includes(normalizeText(row["缺口/待确认"]))).map(row => row.编号).slice(0, 2).join("/");
    }

    function ledgerSupplementFor(def) {
      const text = normalizeText(`${def.模块} ${def.建议表名} ${def["影响科目/台账"]}`);
      const gap = stateRows("gapConfirmations").find(row => text.includes(normalizeText(row.建议)) || normalizeText(row.建议).includes(text.slice(0, 8)));
      return gap?.建议 || def.开发说明 || "";
    }

    function stateRows(key) {
      return window.state ? (window.state[key] || data(key)) : data(key);
    }

    function normalizeText(value) {
      return String(value || "").toLowerCase().replace(/\s+/g, "");
    }

    function seedLedgerRecords(definitions, vouchers) {
      return definitions.flatMap((def, index) => {
        const statusList = String(def.状态流 || "已记录/已冲正").split(/[\/,，]/).filter(Boolean);
        const voucher = vouchers[index % vouchers.length];
        return [0, 1, 2].map((offset) => {
          const amount = [sample.A, sample.W, sample.bonus, sample.settle, sample.VF][(index + offset) % 5];
          const status = statusList[(offset + index) % statusList.length] || "已记录";
          return {
            id: `${def.建议表名}-${index + 1}-${offset + 1}`,
            ledgerModule: def.模块,
            tableName: def.建议表名,
            ledgerNature: def.账本性质,
            businessEntity: def.业务主体,
            postingScope: def.是否正式分录 === "是" ? "正式分录" : def.是否正式分录 === "部分" ? "部分正式/部分信用" : "控制台账",
            controlLedger: def.是否控制台账,
            editablePolicy: def.是否可编辑,
            reversiblePolicy: def.是否可冲正,
            actionPolicy: def.操作口径,
            currentPostingStatus: def.当前是否已落账,
            priority: def.priority,
            sourceId: voucher?.sourceId || `${def.建议表名.toUpperCase()}-${String(52000 + index * 7 + offset)}`,
            sourceTable: def.源表 || voucher?.sourceTable || def.建议表名,
            sourceDoc: voucher?.sourceDoc || voucher?.sourceTable || def.源表 || def.建议表名,
            subject: def.业务主体 || ["总站", "站点A", "代理B", "会员C", "三方通道", "场馆"][((index + offset) % 6)],
            direction: offset % 2 ? "减少" : "增加",
            amount,
            status,
            voucherNo: voucher?.voucherNo || "",
            templateCode: voucher?.templateCode || "",
            reconciliationId: voucher?.reconciliationKey || `REC-${String((index % 20) + 1).padStart(3, "0")}`,
            coverage: ledgerCoverageFor(def),
            gapId: ledgerGapFor(def),
            supplementNote: ledgerSupplementFor(def),
            closeLoopKey: voucher?.closeLoopKey || "",
            closeLoopName: voucher?.closeLoopName || "",
            supplementLedger: voucher?.supplementLedger || def.建议表名,
            reconciliationKey: voucher?.reconciliationKey || "",
            idempotencyKey: voucher?.idempotencyKey || [def.建议表名, voucher?.sourceId || "", voucher?.templateCode || ""].join(" + "),
            updatedAt: now(-(index * 11 + offset * 3)),
            beforeBalance: 10000 + index * 1200 + offset * 250,
            afterBalance: 10000 + index * 1200 + offset * 250 + (offset % 2 ? -amount : amount),
            note: def.开发说明 || def.影响科目台账 || def["影响科目/台账"] || ""
          };
        });
      });
    }

    function now(offsetMinutes = 0) {
      return new Date(Date.now() + offsetMinutes * 60000).toISOString().slice(0, 19).replace("T", " ");
    }

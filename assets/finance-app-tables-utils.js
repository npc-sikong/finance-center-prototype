"use strict";

    function renderTabs(items, active, action) {
      return `<div class="tabs">${items.map(item => `<button class="tab ${item === active ? "active" : ""}" data-action="${action}" data-id="${escapeAttr(item)}">${escapeHtml(item)}</button>`).join("")}</div>`;
    }

    function renderTable({ id, rows, columns, actions }) {
      const tableState = ui.table[id] || (ui.table[id] = { page: 1, query: "", sortKey: "", sortDir: "asc" });
      const query = normalize([tableState.query, ui.globalSearch].filter(Boolean).join(" "));
      let viewRows = rows.filter(row => !query || normalize(JSON.stringify(row)).includes(query));
      if (tableState.sortKey) {
        const key = tableState.sortKey;
        const dir = tableState.sortDir === "asc" ? 1 : -1;
        viewRows = viewRows.slice().sort((a, b) => compare(a[key], b[key]) * dir);
      }
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(viewRows.length / pageSize));
      tableState.page = Math.min(Math.max(1, tableState.page), totalPages);
      const start = (tableState.page - 1) * pageSize;
      const pageRows = viewRows.slice(start, start + pageSize);
      const finalColumns = columns && columns.length ? columns : deriveColumns(rows);
      return `
        <div class="table-shell" data-table="${escapeAttr(id)}">
          <div class="table-toolbar">
            <div class="panel-meta">显示 ${viewRows.length} / ${rows.length} 条</div>
            <input type="search" data-table-search="${escapeAttr(id)}" value="${escapeAttr(tableState.query)}" placeholder="表内搜索" />
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr>
                ${finalColumns.map(col => `<th class="sortable" data-table-sort="${escapeAttr(id)}" data-key="${escapeAttr(col)}">${escapeHtml(columnLabel(col))}</th>`).join("")}
                ${actions ? `<th>操作</th>` : ""}
              </tr></thead>
              <tbody>
                ${pageRows.length ? pageRows.map(row => `<tr>
                  ${finalColumns.map(col => `<td class="${cellClass(col, row[col])}">${formatCell(row[col], col)}</td>`).join("")}
                  ${actions ? `<td><div class="table-actions">${actions(row)}</div></td>` : ""}
                </tr>`).join("") : `<tr><td colspan="${finalColumns.length + (actions ? 1 : 0)}">暂无符合筛选条件的数据</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>第 ${start + 1} - ${Math.min(start + pageSize, viewRows.length)} 条，共 ${viewRows.length} 条</span>
            <div class="pager-buttons">
              <button class="btn sm" data-table-page="${escapeAttr(id)}" data-page="${tableState.page - 1}" ${tableState.page <= 1 ? "disabled" : ""}>上一页</button>
              <span class="pager-page">${tableState.page} / ${totalPages}</span>
              <button class="btn sm" data-table-page="${escapeAttr(id)}" data-page="${tableState.page + 1}" ${tableState.page >= totalPages ? "disabled" : ""}>下一页</button>
            </div>
          </div>
        </div>
      `;
    }

    function preferredColumns(sheet, rows) {
      const map = {
        "覆盖校验": ["动作","类别","覆盖状态","优先级","入账口径","模板","分录行","凭证规则","账本","核销关系","报表科目","缺口编号","备注"],
        "会计科目表": ["科目编码","科目名称","科目类型","增加方向","减少方向","对应主体","辅助核算维度","对应系统字段/表","是否进正式分录"],
        "业务事件清单": ["模板编码","业务名称","触发状态","金额变量","覆盖状态","差异状态","标准会计处理","补记建议"],
        "会计模板": ["模板编码","业务名称","模板性质","触发状态","金额表达式","差异状态","覆盖状态","标准会计处理","补记建议"],
        "会计分录": ["模板编码","分录步骤编号","分录序号","分录组","分录性质","借贷/信用方向","账本/账户","科目类型","金额表达式","影响模块","主体","源表","源字段","进入报表"],
        "系统账变映射": ["来源","编码/类型","业务含义","对应代码/表","财务说明"],
        "动作总览": ["矩阵动作ID","类别","模块","账变动作","交易类型/状态","实际落表影响摘要","应关注但未完整落表","覆盖程度","关联模板"],
        "资金影响明细": ["动作编号","账变动作","主体","资金模块","表/字段","方向","金额口径","是否实际落表","覆盖程度","备注"],
        "资金模块字典": ["主体分类","资金模块","当前表/字段","资金性质","增加含义","减少含义","是否正式资金","关键说明"],
        "闭环总控": ["缺口编号","闭环主题","闭环分类","闭环状态","后端落地状态","责任模块","源单","凭证规则","账本","核销关系","报表科目","核销状态","差异金额","结账影响"],
        "缺口与待确认": ["编号","缺口/待确认","影响动作","当前代码事实","风险","建议","优先级","源码依据"],
        "做账闭环链路": ["链路编号","链路类型","链路名称","关联模板","业务源单","补记账本","核销关系","缺口编号","幂等键","财务口径","状态"],
        "业务映射矩阵": ["映射ID","源表","源类型值","业务事件","模板编码","是否正式凭证","凭证规则","补充表/账本"],
        "账本表结构设计": ["模块","建议表名","表类型","主键/幂等键","核心字段","关联源表","影响科目/台账","状态流","优先级"],
        "核销关系设计": ["核销ID","核销对象","借方/资产端","贷方/负债端","触发核销","核销键","允许部分核销","状态","验收标准"],
        "业务逻辑规则": ["规则编号","规则类别","关联模板","关联凭证规则","触发时点","规则表达式/逻辑","不满足时处理","错误码","验收标准"],
        "状态机定义": ["对象","源表","当前状态","触发事件","守卫条件（关联规则）","目标状态","触发模板/凭证","失败/回退处理"],
        "凭证生成规则": ["规则ID","关联模板","规则性质","是否正式制证","规则展开方式","触发时点","借方行","贷方行","信用台账行","幂等键","验收"],
        "财务补全开发需求": ["风险编号","财务补全模块","优先级","必须补的账本/表","触发业务/时点","需要落账的数据","标准借贷/信用口径","验收标准"],
        "开发验收清单": ["优先级","阶段","开发项","必须完成内容","依赖","验收用例","财务验收口径","状态"],
        "检查表": ["变量","样例值","说明"]
      };
      return map[sheet] || deriveColumns(rows);
    }

    function filteredRows(rows) {
      return rows.filter(row => {
        const text = normalize(JSON.stringify(row));
        if (ui.priority && !text.includes(normalize(ui.priority))) return false;
        if (ui.status && !matchesStatusFilter(text, ui.status)) return false;
        return true;
      });
    }

    function matchesStatusFilter(text, status) {
      const needle = normalize(status);
      if (text.includes(needle)) return true;
      if (needle === normalize("原型已补齐")) return text.includes(normalize("原型已闭环")) || text.includes(normalize("原型闭环已补齐"));
      if (needle === normalize("待清算")) return text.includes(normalize("待核销"));
      if (needle === normalize("已清算")) return text.includes(normalize("已核销"));
      return false;
    }

    function deriveColumns(rows) {
      const keys = [];
      rows.slice(0, 20).forEach(row => Object.keys(row).forEach(key => {
        if (!keys.includes(key)) keys.push(key);
      }));
      return keys.slice(0, 12);
    }

    function rowKey(row) {
      if (row.entryLineId) return row.entryLineId;
      if (row.模板编码 && row.分录序号) return [row.模板编码, row.分录序号, row.科目编码 || "", row.金额表达式 || "", row["借贷/信用方向"] || ""].join("|");
      return row.缺口编号 || row.风险编号 || row.规则编号 || row.规则ID || row.模板编码 || row.映射ID || row.核销ID || row.ID || row.id || Object.values(row).slice(0, 4).join("|");
    }

    function formatCell(value, key) {
      if (value === true) return `<span class="badge green">是</span>`;
      if (value === false) return `<span class="badge gray">否</span>`;
      if (isMoneyKey(key)) return fmtMoney(Number(value || 0));
      const text = translateDisplayValue(value, key);
      if (isStatusKey(key)) return badge(text);
      if (String(key).includes("优先级") || key === "priority") return `<span class="badge ${priorityTone(text)}">${escapeHtml(text)}</span>`;
      if (text.length > 42) return `<span class="clip" title="${escapeAttr(text)}">${escapeHtml(text)}</span>`;
      return escapeHtml(text);
    }

    function isMoneyKey(key) {
      if (["batchBalanced", "balanced", "formal"].includes(String(key))) return false;
      if (["借方行", "贷方行", "信用台账行", "金额表达式", "规则展开方式", "标准借贷/信用口径"].includes(String(key))) return false;
      if (["controlChange"].includes(String(key))) return true;
      return /amount|balance|debit|credit|金额|余额|差异|fee|net|gross|借方|贷方/i.test(String(key));
    }

    function isStatusKey(key) {
      return /状态|status|覆盖|是否/.test(String(key));
    }

    function cellClass(key) {
      if (isMoneyKey(key)) return "money";
      if (/count|数量|序号|步骤|progress|发生额/i.test(String(key))) return "number";
      return "";
    }

    function columnLabel(key) {
      const map = {
        uiStatus: "演示状态",
        priority: "优先级",
        sourceId: "业务单号",
        ledgerModule: "账本模块",
        ledgerNature: "账本性质",
        businessEntity: "业务主体",
        postingScope: "入账范围",
        controlLedger: "是否信用台账",
        editablePolicy: "是否可编辑",
        reversiblePolicy: "是否可冲正",
        actionPolicy: "操作口径",
        currentPostingStatus: "当前落账状态",
        tableName: "建议表名",
        voucherNo: "凭证号",
        templateCode: "模板编码",
        reconciliationId: "核销ID",
        updatedAt: "更新时间",
        beforeBalance: "期初/前值",
        afterBalance: "期末/后值",
        id: "记录ID",
        entryId: "分录ID",
        entryKind: "分录类型",
        subjectCode: "科目编码",
        subjectName: "科目名称",
        subjectType: "科目类型",
        lineNo: "分录序号",
        entryStepNo: "分录步骤编号",
        entrySequenceNo: "分录序号",
        direction: "方向",
        debitAmount: "借方金额",
        creditAmount: "贷方金额",
        controlChange: "信用金额",
        increaseAmount: "台账增加",
        decreaseAmount: "台账减少",
        netChange: "净变动",
        relationText: "分录关系",
        batchBalanced: "凭证平衡",
        formalLineCount: "正式行",
        controlLineCount: "信用行",
        lineCount: "行数",
        subjectSummary: "涉及科目",
        sourceField: "源字段",
        matrixAction: "矩阵动作",
        matrixCoverage: "矩阵覆盖",
        coverage: "覆盖程度",
        gapId: "缺口编号",
        supplementNote: "补记说明",
        sourceBasis: "源码依据",
        matrixPriority: "矩阵优先级",
        closeLoopKey: "入账链路类型",
        closeLoopName: "入账链路名称",
        sourceDoc: "业务源单",
        supplementLedger: "补记账本",
        reconciliationKey: "核销键",
        idempotencyKey: "幂等键",
        expression: "金额表达式",
        formal: "正式分录",
        amount: "金额",
        entity: "主体",
        主体: "影响主体",
        业务主体: "业务主体",
        subject: "影响主体",
        source: "来源",
        balanced: "借贷平衡",
        rule: "凭证规则",
        lines: "分录行",
        vars: "金额变量",
        note: "备注",
        isReverse: "是否冲正凭证",
        reversedFrom: "冲正来源凭证",
        reversedBy: "冲正凭证号",
        status: "状态",
        ruleId: "规则ID",
        bizName: "业务名称",
        postedAt: "入账时间",
        debit: "借方",
        credit: "贷方",
        balance: "余额/净额",
        controlAmount: "信用金额",
        sourceTable: "源表",
        核销ID: "核销ID",
        核销关系: "核销关系",
        核销对象: "核销对象",
        object: "核销对象",
        diff: "差异",
        progress: "进度",
        backendStatus: "后端落地状态",
        closeImpact: "关账影响",
        closePeriod: "结账期间",
        ageHours: "账龄小时",
        diffAmount: "差异金额",
        nextAction: "下一步动作",
        reportSubject: "报表科目"
      };
      return map[key] || key;
    }

    function badge(text) {
      const value = String(text || "-");
      let tone = "gray";
      if (/已|成功|打开|正常|通过|完成|平衡|启用/.test(value)) tone = "green";
      if (/待|部分|草稿|冻结|复核|评审/.test(value)) tone = "amber";
      if (/差异|失败|拒绝|冲正|异常|坏账|停用/.test(value)) tone = "red";
      if (/资产|借|P1/.test(value)) tone = "blue";
      if (/负债|贷|P2/.test(value)) tone = "violet";
      if (/信用|P0/.test(value)) tone = "teal";
      return `<span class="badge ${tone}">${escapeHtml(value)}</span>`;
    }

    function priorityTone(priority) {
      if (priority === "P0") return "teal";
      if (priority === "P1") return "blue";
      if (priority === "P2") return "violet";
      return "gray";
    }

    function metric(label, value, note, tone = "") {
      return `<div class="metric ${tone}"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(String(value))}</div><div class="metric-note">${escapeHtml(note || "")}</div></div>`;
    }

    function renderCheckCells() {
      const checks = [
        ["G", sample.G, "充值毛额"],
        ["F", sample.F, "通道手续费"],
        ["A", sample.A, "实际入账 = G - F"],
        ["W", sample.W, "提现金额"],
        ["N", sample.N, "实际到账 = W - F"]
      ];
      return checks.map(([key, value, note]) => `<div class="check-cell"><span class="badge blue">${key}</span><strong>${fmtMoney(value)}</strong><span class="panel-meta">${note}</span></div>`).join("");
    }

    function detailList(row, keys = Object.keys(row || {})) {
      return `<dl class="detail-list">${keys.map(key => `
        <dt>${escapeHtml(columnLabel(key))}</dt><dd>${formatDetail(row?.[key], key)}</dd>
      `).join("")}</dl>`;
    }

    function formatDetail(value, key = "") {
      if (Array.isArray(value)) {
        if (value.length && typeof value[0] === "object") {
          const rows = detailArrayRows(value);
          return renderTable({ id: `detail-${Math.random()}`, rows, columns: deriveColumns(rows), actions: null });
        }
        return escapeHtml(value.map(item => translateDisplayValue(item, key)).join(", "));
      }
      if (value && typeof value === "object") return `<pre>${escapeHtml(JSON.stringify(localizeDetailObject(value), null, 2))}</pre>`;
      if (value === true || value === false) return badge(value ? "是" : "否");
      if (isMoneyKey(key)) return fmtMoney(Number(value || 0));
      const text = translateDisplayValue(value, key);
      if (isStatusKey(key) || key === "batchBalanced") return badge(text);
      return escapeHtml(text);
    }

    function translateDisplayValue(value, key = "") {
      if (value == null || value === "") return "-";
      if (value === true) return "是";
      if (value === false) return "否";
      const text = String(value);
      if (text === "待核销") return "待清算";
      if (text === "已核销") return "已清算";
      const displayText = productionDisplayText(text);
      const variableMap = {
        G: "充值毛额 G",
        F: "通道手续费 F",
        A: "实际入账 A",
        W: "提现/转账金额 W",
        N: "提现实际到账 N",
        bonus: "礼金/红包金额 bonus",
        prepaid: "预付金金额 prepaid",
        VF: "场馆费 VF",
        settle: "月结应收 settle",
        commission: "佣金金额 commission",
        mainShare: "总站分润 mainShare",
        siteShare: "站点分润 siteShare",
        rent: "站点月租 rent"
      };
      const sourceMap = {
        demo_source: "演示来源",
        member_account_record: "会员账户账变表",
        fund_pool_record: "资金池账变表",
        prepaid_account: "预付金账户",
        operation_fee_record: "运营手续费记录",
        deposit_withdraw_operation_fee_record: "充提手续费记录",
        site_monthly_settlement_bill: "站点月结账单",
        venue_fee_monthly_official: "官方场馆费月账单",
        commission_bill: "佣金账单",
        game_record: "游戏记录",
        bet_records: "投注记录",
        official_account_record: "官方账户流水",
        official_account: "官方账户主档",
        channel_clearance_ledger: "三方通道清算账本",
        fee_clearance_ledger: "手续费清算账本",
        site_deposit_withdraw_fee_record: "站点充提手续费补录",
        fund_pool_quota_control_record: "资金池额度信用流水",
        withdraw_order: "提现订单",
        withdraw_payable_ledger: "提现待付负债账本",
        member_red_packet: "红包单据",
        red_packet_liability_ledger: "红包待领负债账本",
        prepaid_external_payment_record: "预付金外部付款凭证",
        prepaid_account_record: "预付金内部控制台账",
        "prepaid_account / prepaid_account_record": "预付金账户和内部控制台账",
        nexus_prepaid_settlement_ledger: "外部预付金冻结结算台账",
        "nexus_order / prepaid_account": "外部预付订单和预付金账户",
        reward_claim_record: "奖励领取记录",
        reward_cost_journal: "奖励成本凭证源",
        commission_expense_source_snapshot: "运营费用分摊信用台账",
        site_monthly_receivable_record: "站点月结应收账本",
        venue_payment_record: "场馆费付款记录",
        venue_fee_payable_record: "场馆费应付账本",
        venue_wallet_record: "场馆钱包流水",
        game_settlement_ledger: "游戏结算总账源",
        quota_adjustment_transfer_voucher: "额度调账与转账凭证源",
        quota_transfer_voucher: "额度调拨转账凭证源",
        commission_bill_ledger: "代理佣金账单账本",
        commission_record_migration: "老佣金迁移台账",
        accounting_voucher_batch: "凭证批次",
        accounting_voucher_line: "凭证明细",
        finance_biz_type_mapping: "业务映射表",
        accounting_idempotency_link: "做账幂等关联",
        accounting_reconciliation_link: "核销关系台账",
        accounting_source_link: "做账源单关联",
        "deposit_withdraw_operation_fee_record / fee_clearance_ledger": "充提手续费记录和清算账本",
        "fund_pool_record / member_account_record": "资金池流水和会员账户流水",
        "accounting_voucher_batch / official_account_record / channel_clearance_ledger": "凭证、官方现金流水和三方清算账本"
      };
      if (["expression", "sourceField"].includes(key) && variableMap[displayText]) return variableMap[displayText];
      if (["source", "sourceTable", "sourceDoc"].includes(key) && sourceMap[displayText]) return sourceMap[displayText];
      if (key === "formal") return /true/i.test(displayText) ? "是" : /false/i.test(displayText) ? "否" : displayText;
      if (key === "balanced") return /true/i.test(displayText) ? "平衡" : /false/i.test(displayText) ? "不平衡" : displayText;
      if (key === "entryKind") return displayText === "formal" ? "正式分录" : displayText === "control" ? "信用台账" : displayText;
      return displayText;
    }

    function productionDisplayText(text) {
      return String(text || "")
        .replace(/原型流水已闭环/g, "原型流水已补齐")
        .replace(/原型闭环已补齐/g, "原型入账已补齐")
        .replace(/原型已闭环/g, "原型已补齐")
        .replace(/补齐原型闭环/g, "补齐入账链路")
        .replace(/闭环总控/g, "入账追踪")
        .replace(/闭环/g, "入账链路")
        .replace(/期间结账/g, "报表统计");
    }

    function detailArrayRows(value) {
      if (!value.every(item => item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "lineNo"))) return value;
      return value.map((item, index) => voucherLineDetailRow(item, index));
    }

    function voucherLineDetailRow(line, index = 0) {
      const { lineNo, ...rest } = line || {};
      return {
        分录步骤编号: index + 1,
        分录序号: Number(lineNo || index + 1),
        ...rest
      };
    }

    function localizeDetailObject(value) {
      return Object.fromEntries(Object.entries(value).map(([key, val]) => {
        if (Array.isArray(val)) return [columnLabel(key), val.map(item => item && typeof item === "object" ? localizeDetailObject(item) : translateDisplayValue(item, key))];
        if (val && typeof val === "object") return [columnLabel(key), localizeDetailObject(val)];
        return [columnLabel(key), translateDisplayValue(val, key)];
      }));
    }

    function hydrateDerivedControls() {
      return;
    }

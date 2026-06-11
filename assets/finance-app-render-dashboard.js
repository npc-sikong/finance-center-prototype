"use strict";

    function businessFundingProfiles() {
      return [
        { type: "会员充值", subjectType: "会员", subjectName: "会员主钱包", direction: "增加", amount: "G", fee: "F", actual: "A", balance: "会员余额 +A", control: "总站/站点资金池额度 +A", ledger: "会员/代理主钱包流水；官方现金流水；三方通道清算；充提手续费清算账本（会员/代理/站点）", hint: ["TPL-MDEP-001"], backend: "已落账，需补官方账户和三方清算总账", advice: "核对充值单、手续费、会员余额、官方收款和资金池额度" },
        { type: "会员提现申请", subjectType: "会员", subjectName: "会员主钱包", direction: "待付", amount: "W", fee: "F", actual: "N", balance: "会员余额 -W，提现待付 +N", control: "可提现额度/资金池额度预扣 W", ledger: "提现待付负债（会员/代理/站点）；会员/代理主钱包流水", hint: ["TPL-MWDR-001"], backend: "部分落账，后端待补提现待付总账", advice: "确认申请预扣、手续费和待付负债是否同时形成" },
        { type: "会员提现成功", subjectType: "会员", subjectName: "会员主钱包", direction: "核销", amount: "W", fee: "F", actual: "N", balance: "提现待付 -N，官方出款 -W", control: "资金池额度确认扣减 W", ledger: "提现待付负债（会员/代理/站点）；官方现金流水；充提手续费清算账本（会员/代理/站点）", hint: ["TPL-MWDR-002"], backend: "部分落账，后端待补官方出款流水", advice: "核销提现单、待付负债、官方出款和手续费代扣" },
        { type: "会员提现失败回退", subjectType: "会员", subjectName: "会员主钱包", direction: "回退", amount: "W", fee: "F", actual: "N", balance: "会员余额 +W，提现待付冲回", control: "资金池额度回退 W", ledger: "提现待付负债（会员/代理/站点）；会员/代理主钱包流水", hint: ["TPL-MWDR-003"], backend: "部分落账，需确认失败回退链路", advice: "失败/拒绝必须反向回退会员余额和控制额度" },
        { type: "代理充值", subjectType: "代理", subjectName: "代理主钱包", direction: "增加", amount: "G", fee: "F", actual: "A", balance: "代理余额 +A", control: "三方应收/手续费清算", ledger: "会员/代理主钱包流水；官方现金流水；三方通道清算", hint: ["TPL-AGENT-RECHARGE"], backend: "部分落账，需补官方账户总账", advice: "按代理充值单核对代理余额、手续费和官方收款" },
        { type: "代理提现", subjectType: "代理", subjectName: "代理主钱包", direction: "减少", amount: "W", fee: "F", actual: "N", balance: "代理余额 -W，提现待付 +N", control: "手续费代扣/应付清算 F", ledger: "会员/代理主钱包流水；提现待付负债（会员/代理/站点）；官方现金流水", hint: ["TPL-AGENT-WITHDRAW"], backend: "部分落账，需补提现待付和官方出款", advice: "代理提现也必须拆申请、成功、失败和手续费" },
        { type: "站点充值", subjectType: "站点", subjectName: "站点余额", direction: "增加", amount: "G", fee: "F", actual: "A", balance: "站点余额 +A", control: "站点资金池额度 +A", ledger: "站点/总站余额流水；官方现金流水；三方通道清算", hint: ["TPL-SITE-RECHARGE"], backend: "部分落账，站点手续费来源需补", advice: "站点充值要区分站点余额、资金池额度和手续费清算" },
        { type: "站点提现", subjectType: "站点", subjectName: "站点余额", direction: "减少", amount: "W", fee: "F", actual: "N", balance: "站点余额 -W", control: "站点资金池额度 -W", ledger: "站点/总站余额流水；提现待付负债（会员/代理/站点）；官方现金流水", hint: ["TPL-SITE-WITHDRAW"], backend: "部分落账，需补站点提现手续费审计", advice: "站点提现不能只扣资金池，必须补待付和官方出款核销" },
        { type: "总站转站点", subjectType: "总站/站点", subjectName: "总站余额 -> 站点余额", direction: "转账", amount: "W", fee: "0", actual: "W", balance: "总站余额 -W，站点余额 +W", control: "站点资金池额度按配置增加", ledger: "站点/总站余额流水；额度调拨/转账凭证源", hint: ["TPL-TRANSFER", "总站转站点"], backend: "已落账，需区分余额和额度", advice: "明确来源方、接收方和资金池额度影响" },
        { type: "站点转代理/会员", subjectType: "站点/代理/会员", subjectName: "站点余额 -> 接收方余额", direction: "转账", amount: "W", fee: "0", actual: "W", balance: "站点余额 -W，代理/会员余额 +W", control: "站点资金池额度占用或释放", ledger: "站点/总站余额流水；会员/代理主钱包流水；额度调拨/转账凭证源", hint: ["TPL-TRANSFER", "站点转"], backend: "部分落账，需补统一转账凭证源", advice: "站点转账要同时看站点余额和接收方余额" },
        { type: "代理转代理/会员", subjectType: "代理/会员", subjectName: "代理余额 -> 接收方余额", direction: "转账", amount: "W", fee: "0", actual: "W", balance: "代理余额 -W，代理/会员余额 +W", control: "不进资金池或按规则记录信用占用", ledger: "会员/代理主钱包流水；额度调拨/转账凭证源", hint: ["TPL-TRANSFER", "代理转"], backend: "部分落账，需补统一凭证源", advice: "代理转账必须能追到来源代理和接收方" },
        { type: "会员/代理/站点调额", subjectType: "会员/代理/站点", subjectName: "被调额主体", direction: "增加/减少", amount: "W", fee: "0", actual: "W", balance: "对应主体余额按审批结果增减", control: "资金池额度/可提现额度按规则联动", ledger: "额度调账与转账凭证源；会员/代理主钱包流水；站点/总站余额流水", hint: ["TPL-QUOTA", "TPL-MEMBER-ADMIN-ADJUST"], backend: "部分落账，旧入口需统一", advice: "调额必须保留审批来源、前后余额和资金池影响" },
        { type: "红包发放", subjectType: "总站/站点/代理", subjectName: "红包发放方", direction: "减少", amount: "bonus", fee: "0", actual: "bonus", balance: "发放方余额 -bonus", control: "红包待领负债 +bonus", ledger: "红包待领负债；站点/总站余额流水；会员/代理主钱包流水", hint: ["TPL-RP-*-SEND"], backend: "后端待补红包待领负债", advice: "发放时只形成待领负债，不能直接重复确认成本" },
        { type: "红包领取", subjectType: "会员", subjectName: "会员主钱包", direction: "增加", amount: "bonus", fee: "0", actual: "bonus", balance: "会员余额 +bonus", control: "红包待领负债 -bonus", ledger: "红包待领负债；会员/代理主钱包流水", hint: ["TPL-RP-CLAIM"], backend: "后端待补待领负债核销", advice: "领取时核销待领负债并增加会员余额" },
        { type: "红包退回", subjectType: "总站/站点/代理", subjectName: "红包发放方", direction: "回退", amount: "bonus", fee: "0", actual: "bonus", balance: "发放方余额 +bonus", control: "红包待领负债 -bonus", ledger: "红包待领负债；站点/总站余额流水；会员/代理主钱包流水", hint: ["TPL-RP-*-REFUND"], backend: "后端待补红包退回核销", advice: "过期未领必须退回发放方并清待领负债" },
        { type: "VIP福利", subjectType: "会员", subjectName: "会员主钱包", direction: "增加", amount: "bonus", fee: "0", actual: "bonus", balance: "会员余额 +bonus", control: "费用快照引用成本凭证", ledger: "奖励成本凭证源；会员/代理主钱包流水", hint: ["TPL-REWARD", "VIP"], backend: "后端待补正式成本凭证", advice: "会员余额增加必须同步借记 VIP 福利成本" },
        { type: "返水", subjectType: "会员", subjectName: "会员主钱包", direction: "增加", amount: "bonus", fee: "0", actual: "bonus", balance: "会员余额 +bonus", control: "费用快照引用返水成本", ledger: "奖励成本凭证源；会员/代理主钱包流水", hint: ["TPL-REWARD", "返水"], backend: "后端待补正式成本凭证", advice: "返水不能只加会员余额，必须补返水成本凭证" },
        { type: "活动奖励", subjectType: "会员", subjectName: "会员主钱包", direction: "增加", amount: "bonus", fee: "0", actual: "bonus", balance: "会员余额 +bonus", control: "活动成本来源/费用快照", ledger: "奖励成本凭证源；会员/代理主钱包流水", hint: ["TPL-MAIN-ACTIVITY-CASH-ISSUE", "活动"], backend: "后端待补成本来源", advice: "活动彩金领取后走活动成本，不把费用快照当二次成本" },
        { type: "推广奖励", subjectType: "会员/代理", subjectName: "推广受益方", direction: "增加", amount: "bonus", fee: "0", actual: "bonus", balance: "会员或代理余额 +bonus", control: "推广成本来源/费用快照", ledger: "奖励成本凭证源；会员/代理主钱包流水", hint: ["TPL-REWARD", "推广"], backend: "后端待补正式成本凭证", advice: "推广首充、累充、返水奖励都要有推广成本凭证" },
        { type: "代理佣金", subjectType: "代理", subjectName: "代理主钱包", direction: "增加", amount: "commission", fee: "0", actual: "commission", balance: "代理余额 +commission", control: "佣金账单与费用来源", ledger: "代理佣金账单账本；会员/代理主钱包流水", hint: ["TPL-COMM", "commission_bill"], backend: "已落账，需补正式凭证和冲正关系", advice: "以 commission_bill 为正式佣金口径，老记录只做兼容" },
        { type: "佣金冲正/历史债务", subjectType: "代理", subjectName: "代理主钱包", direction: "冲正/核销", amount: "commission", fee: "0", actual: "commission", balance: "代理余额调整，成本转回或债务核销", control: "老佣金迁移幂等检查", ledger: "代理佣金账单账本；老佣金迁移台账（一次性/只读）", hint: ["TPL-CLOSE-IDEMPOTENCY-LINK", "commission_record_migration"], backend: "需历史治理", advice: "区分新佣金账单、老佣金迁移和历史债务扣减" },
        { type: "站点月结", subjectType: "站点/总站", subjectName: "站点月结账单", direction: "应收/核销", amount: "settle", fee: "0", actual: "settle", balance: "站点月结应收 +settle，现金收款后核销", control: "额度自动扣减只记信用台账", ledger: "月结应收；官方现金流水；站点/总站余额流水", hint: ["TPL-SITE-MONTHLY-BILL", "TPL-SITE-MONTHLY-CASH"], backend: "后端待补现金收款核销", advice: "区分应收、额度扣减、现金收款，不把自动结算当现金到账" },
        { type: "预付金/Nexus", subjectType: "站点/Nexus", subjectName: "站点预付金", direction: "冻结/扣减/退回", amount: "prepaid", fee: "0", actual: "prepaid", balance: "预付金可用/冻结按订单变化", control: "Nexus 冻结、结算、退款", ledger: "预付金内部台账；外部预付金冻结结算台账；预付金外部付款", hint: ["TPL-NEXUS-PREPAID", "TPL-PREPAID"], backend: "部分落账，外部付款凭证待补", advice: "预付金内部信用和外部付款资产必须分开" },
        { type: "场馆转入/转出", subjectType: "会员/场馆", subjectName: "主钱包 <-> 场馆钱包", direction: "重分类", amount: "gameAmount", fee: "0", actual: "gameAmount", balance: "会员主钱包与场馆钱包互转", control: "场馆钱包控制台账", ledger: "场馆钱包流水；会员/代理主钱包流水", hint: ["TPL-GAME-MAIN-TO-VENUE"], backend: "后端待补统一场馆钱包总账", advice: "主钱包和场馆钱包互转不是平台收入或成本" },
        { type: "投注/中奖", subjectType: "会员/场馆", subjectName: "游戏结算批次", direction: "收入/成本", amount: "gameAmount", fee: "0", actual: "gameAmount", balance: "场馆钱包减少或增加", control: "游戏结算来源总账", ledger: "游戏结算总账源；场馆钱包流水", hint: ["TPL-GAME-BET", "TPL-GAME-WIN"], backend: "业务记录已存在，正式总账待补", advice: "投注和中奖需接场馆账务后补正式收入/派奖成本" },
        { type: "场馆费", subjectType: "场馆/总站", subjectName: "场馆费账单", direction: "应付/付款", amount: "VF", fee: "0", actual: "VF", balance: "场馆费应付 +VF，付款后官方出款 -VF", control: "周/月分摊来源", ledger: "场馆费应付；官方现金流水", hint: ["TPL-VENUE-FEE-OFFICIAL", "TPL-CLOSE-VENUE-FEE-PAYMENT"], backend: "后端待补官方付款核销", advice: "先确认应付，付款必须关联官方出款账户" },
        { type: "手续费差异", subjectType: "三方/站点/会员", subjectName: "充提手续费审计", direction: "差异", amount: "OF", fee: "F", actual: "OF", balance: "不直接改主体余额", control: "真实费、站点报价、会员扣款差异归属", ledger: "充提手续费清算账本（会员/代理/站点）；三方通道清算", hint: ["TPL-FEE-RECON"], backend: "已记录审计字段，清算总账待补", advice: "默认不确认为平台收入，差异先挂清算/费用来源" }
      ];
    }

    function businessFundingRows() {
      return businessFundingProfiles().map((profile, index) => {
        const voucher = findVoucherForBusinessProfile(profile);
        const ledger = findLedgerForBusinessProfile(profile, voucher);
        const reconciliation = findReconciliationForBusinessProfile(profile, voucher, ledger);
        const amount = evaluateAmount(profile.amount);
        const fee = evaluateAmount(profile.fee);
        const actual = evaluateAmount(profile.actual);
        const sourceId = voucher?.sourceId || ledger?.sourceId || `BIZ-${String(92000 + index).padStart(6, "0")}`;
        const sourceTable = voucher?.sourceTable || ledger?.sourceTable || "";
        const attribution = buildEntityAttribution({
          sourceId,
          voucherNo: voucher?.voucherNo || "",
          bizName: profile.type,
          entity: profile.subjectType,
          subjectName: profile.subjectName,
          sourceTable,
          sourceDoc: voucher?.sourceDoc || ledger?.sourceDoc || "",
          supplementLedger: profile.ledger,
          note: `${profile.balance || ""} ${profile.control || ""} ${profile.advice || ""}`,
          preferredType: profile.subjectType
        }, `${profile.type} ${profile.subjectType} ${profile.subjectName} ${profile.ledger} ${profile.balance} ${profile.control}`);
        return {
          _id: `BIZ-FUND-${String(index + 1).padStart(3, "0")}`,
          _voucherNo: voucher?.voucherNo || "",
          _ledgerRecordId: ledger?.id || "",
          _reconciliationId: reconciliation?.id || "",
          _sourceTable: sourceTable,
          _templateCode: voucher?.templateCode || "",
          业务时间: voucher?.postedAt || ledger?.updatedAt || now(-(index * 17 + 3)),
          业务单号: sourceId,
          业务类型: profile.type,
          站点ID: attribution.站点ID,
          站点名称: attribution.站点名称,
          发起主体身份: attribution.initiatorType,
          发起主体ID: attribution.initiatorId,
          发起主体名称: attribution.initiatorName,
          代理ID: attribution.代理ID,
          代理名称: attribution.代理名称,
          会员ID: attribution.会员ID,
          会员名称: attribution.会员名称,
          资金方向: profile.direction,
          交易金额: amount,
          手续费: fee,
          "实际入账/出款": actual,
          影响余额: profile.balance,
          影响控制台账: profile.control,
          关联账本: profile.ledger,
          凭证号: voucher?.voucherNo || "待生成",
          借贷状态: voucherBalanceStatus(voucher),
          核销状态: reconciliation?.status || ledger?.status || "待核销",
          后端落账状态: profile.backend,
          财务处理建议: profile.advice,
          技术源表: sourceTable,
          模板编码: voucher?.templateCode || profile.hint.join("；"),
          核销关系: reconciliation?.reconciliationKey || ledger?.reconciliationKey || ""
        };
      });
    }

    function findVoucherForBusinessProfile(profile) {
      const hints = profile.hint || [];
      return (state.voucherBatches || []).find(batch => {
        const text = `${batch.templateCode || ""} ${batch.bizName || ""} ${batch.sourceTable || ""}`;
        return hints.some(hint => templateMatches(text, [hint]) || normalize(text).includes(normalize(hint)));
      }) || null;
    }

    function findLedgerForBusinessProfile(profile, voucher) {
      const text = normalize(`${profile.ledger || ""} ${voucher?.voucherNo || ""} ${voucher?.sourceId || ""}`);
      return (state.ledgerRecords || []).find(row => {
        if (voucher?.voucherNo && row.voucherNo === voucher.voucherNo) return true;
        return [row.ledgerModule, row.tableName, row.supplementLedger, row.sourceTable].filter(Boolean).some(value => text.includes(normalize(value)));
      }) || null;
    }

    function findReconciliationForBusinessProfile(profile, voucher, ledger) {
      const text = normalize(`${profile.type || ""} ${profile.ledger || ""} ${voucher?.voucherNo || ""} ${ledger?.gapId || ""}`);
      return (state.reconciliationRecords || []).find(row => {
        if (voucher?.voucherNo && row.voucherNo === voucher.voucherNo) return true;
        if (ledger?.gapId && row.gapId === ledger.gapId) return true;
        return [row.object, row.supplementLedger, row.sourceTable, row.closeLoopName].filter(Boolean).some(value => text.includes(normalize(value)));
      }) || null;
    }

    function voucherBalanceStatus(voucher) {
      if (!voucher) return "待生成";
      const debit = Number(voucher.debit || 0);
      const credit = Number(voucher.credit || 0);
      if (!debit && !credit && Number(voucher.controlAmount || 0)) return "不进正式分录";
      if (Math.abs(debit - credit) < 0.01) return "平衡";
      if (!debit) return "缺借方";
      if (!credit) return "缺贷方";
      return "不平衡";
    }

    function businessFundingSummary(rows = businessFundingRows()) {
      return {
        total: rows.length,
        amount: sum(rows, "交易金额"),
        fee: sum(rows, "手续费"),
        pending: rows.filter(row => /待|需补|部分|差异|确认/.test(`${row.核销状态} ${row.后端落账状态} ${row.借贷状态}`)).length,
        balanced: rows.filter(row => row.借贷状态 === "平衡").length,
        backendPending: rows.filter(row => /待补|待落地|需补|部分/.test(row.后端落账状态)).length,
        unreconciled: rows.filter(row => /待|差异|部分|需确认/.test(row.核销状态)).length
      };
    }

    function filterBusinessFundingRows(rows) {
      return (rows || []).filter(row => {
        if (ui.businessFundingBizTypeFilter && row.业务类型 !== ui.businessFundingBizTypeFilter) return false;
        if (!rowMatchesEntityOption(row, "站点ID", "站点名称", ui.businessFundingSiteFilter)) return false;
        if (ui.businessFundingInitiatorTypeFilter && row.发起主体身份 !== ui.businessFundingInitiatorTypeFilter) return false;
        if (!rowMatchesEntityOption(row, "发起主体ID", "发起主体名称", ui.businessFundingInitiatorFilter)) return false;
        if (ui.businessFundingDirectionFilter && row.资金方向 !== ui.businessFundingDirectionFilter) return false;
        if (ui.businessFundingVoucherStatusFilter && row.借贷状态 !== ui.businessFundingVoucherStatusFilter) return false;
        if (ui.businessFundingReconStatusFilter && row.核销状态 !== ui.businessFundingReconStatusFilter) return false;
        if (ui.businessFundingBackendStatusFilter && row.后端落账状态 !== ui.businessFundingBackendStatusFilter) return false;
        return true;
      });
    }

    function currentBusinessFundingRows() {
      return filteredRows(filterBusinessFundingRows(businessFundingRows()));
    }

    function businessFundingFilterLabels() {
      return {
        业务类型: ui.businessFundingBizTypeFilter || "全部",
        站点: ui.businessFundingSiteFilter || "全部",
        发起主体身份: ui.businessFundingInitiatorTypeFilter || "全部",
        发起主体: ui.businessFundingInitiatorFilter || "全部",
        资金方向: ui.businessFundingDirectionFilter || "全部",
        借贷状态: ui.businessFundingVoucherStatusFilter || "全部",
        核销状态: ui.businessFundingReconStatusFilter || "全部",
        后端落账状态: ui.businessFundingBackendStatusFilter || "全部"
      };
    }

    function renderBusinessFundingFilters(sourceRows) {
      return `
        <div class="panel">
          <div class="panel-head">
            <div><h2 class="panel-title">资金明细筛选</h2><span class="panel-meta">按业务、主体、资金方向、凭证状态和核销状态过滤。</span></div>
            <button class="btn" data-action="clear-business-funding-filters">清空筛选</button>
          </div>
          <div class="panel-body filter-grid">
            ${renderReportSelect("businessFundingBizTypeFilter", "业务类型", ui.businessFundingBizTypeFilter, uniqueRowValues(sourceRows, "业务类型"))}
            ${renderReportSelect("businessFundingSiteFilter", "站点", ui.businessFundingSiteFilter, uniqueEntityOptions(sourceRows, "站点ID", "站点名称"))}
            ${renderReportSelect("businessFundingInitiatorTypeFilter", "发起主体身份", ui.businessFundingInitiatorTypeFilter, uniqueRowValues(sourceRows, "发起主体身份"))}
            ${renderReportSelect("businessFundingInitiatorFilter", "发起主体", ui.businessFundingInitiatorFilter, uniqueEntityOptions(sourceRows, "发起主体ID", "发起主体名称"))}
            ${renderReportSelect("businessFundingDirectionFilter", "资金方向", ui.businessFundingDirectionFilter, uniqueRowValues(sourceRows, "资金方向"))}
            ${renderReportSelect("businessFundingVoucherStatusFilter", "借贷状态", ui.businessFundingVoucherStatusFilter, uniqueRowValues(sourceRows, "借贷状态"))}
            ${renderReportSelect("businessFundingReconStatusFilter", "核销状态", ui.businessFundingReconStatusFilter, uniqueRowValues(sourceRows, "核销状态"))}
            ${renderReportSelect("businessFundingBackendStatusFilter", "后端落账状态", ui.businessFundingBackendStatusFilter, uniqueRowValues(sourceRows, "后端落账状态"))}
          </div>
        </div>
      `;
    }

    function renderDashboard() {
      const formal = formalSummary();
      const summary = financeActivitySummary();
      const businessRows = businessFundingRows();
      const businessSummary = businessFundingSummary(businessRows);
      const ledgerDefs = ledgerCenterDefinitions();
      const recentPostings = businessRows.slice(0, 10);
      const metrics = [
        ["业务资金事件", businessSummary.total, "覆盖实际资金变动", "info"],
        ["交易金额", fmtMoney(businessSummary.amount), "当前样例口径合计", "good"],
        ["手续费", fmtMoney(businessSummary.fee), "充提/三方费用", "warn"],
        ["未核销/差异", businessSummary.unreconciled, "待核销、差异或需确认", businessSummary.unreconciled ? "warn" : "good"],
        ["后端待补", businessSummary.backendPending, "部分落账或待落地", businessSummary.backendPending ? "warn" : "good"],
        ["借贷差异", fmtMoney(Math.abs(formal.debit - formal.credit)), formal.balanced ? "正式分录平衡" : "需复核", formal.balanced ? "good" : "bad"],
        ["账本类型", ledgerDefs.length, "财务审核账本", "info"],
        ["信用净变动", fmtMoney(summary.creditNet), "不进借贷平衡", "warn"]
      ];
      return `
        ${renderPageHead("资金账变总览", "按实际业务资金变动总览每笔钱的来源、去向、余额影响、凭证、账本和核销状态。", `
          <button class="btn primary" data-nav="business-details">业务资金明细</button>
          <button class="btn primary" data-nav="ledgers">账本中心</button>
          <button class="btn" data-nav="entries">会计分录报表</button>
          <button class="btn" data-nav="reconciliation">核销对账</button>
          <button class="btn" data-nav="reports">财务报表</button>
          <button class="btn" data-nav="config">会计模板配置</button>
        `)}
        <div class="metrics dashboard-metrics">${metrics.map(([label, value, note, tone]) => metric(label, value, note, tone)).join("")}</div>
        ${renderLedgerBoard()}
        <div class="grid-2">
          <div class="panel">
            <div class="panel-head"><h2 class="panel-title">最近业务资金变动</h2><span class="panel-meta">${recentPostings.length} 笔</span></div>
            ${renderTable({
              id: "dashboard-business-funding",
              rows: filteredRows(recentPostings),
            columns: ["业务时间", "业务单号", "业务类型", "站点ID", "站点名称", "发起主体身份", "发起主体ID", "发起主体名称", "代理ID", "代理名称", "会员ID", "会员名称", "资金方向", "交易金额", "凭证号", "核销状态", "后端落账状态"],
              actions: row => renderBusinessFundingActions(row)
            })}
          </div>
          <div class="panel">
            <div class="panel-head"><h2 class="panel-title">最近审计时间线</h2><span class="panel-meta">${state.auditTrail.length} 条</span></div>
            <div class="panel-body">
              <div class="timeline">
                ${state.auditTrail.slice(0, 5).map(item => `
                  <div class="timeline-item">
                    <div class="timeline-time">${escapeHtml(item.time)}</div>
                    <div><strong>${escapeHtml(item.action)}</strong><br><span class="panel-meta">${escapeHtml(item.target)} · ${escapeHtml(item.result)}</span></div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2 class="panel-title">关键会计检查</h2><span class="panel-meta">G/F/A、W/F/N、信用类分离</span></div>
          <div class="panel-body check-grid">
            ${renderCheckCells()}
          </div>
        </div>
      `;
    }

    function renderLedgerBoard() {
      const rows = ledgerBoardRows();
      const totals = rows.reduce((acc, row) => {
        acc.primary += row.primaryAmount;
        acc.secondary += row.secondaryAmount;
        acc.diff += row.diffAmount;
        acc.records += row.recordCount;
        return acc;
      }, { primary: 0, secondary: 0, diff: 0, records: 0 });
      return `
        <section class="ledger-board" aria-label="账本看板">
          <div class="ledger-board-head">
            <div class="ledger-board-copy">
              <h2 class="section-title">账本看板</h2>
              <p class="page-subtitle">每个账本一张卡片，只展示会计审核需要看到的资金账本和必要信用台账。</p>
              <div class="ledger-board-summary">
                <span>筛选记录：<strong>${totals.records}</strong></span>
                <span>第一列合计：<strong>${fmtMoney(totals.primary)}</strong></span>
                <span>第二列合计：<strong>${fmtMoney(totals.secondary)}</strong></span>
                <span>差额合计：<strong>${fmtMoney(totals.diff)}</strong></span>
              </div>
            </div>
            <div class="ledger-board-toolbar">
              <div class="ledger-filter-caption">日期筛选</div>
              <div class="ledger-board-quick">
                ${ledgerBoardQuickButtons().map(item => `<button class="btn sm ${ui.ledgerBoardQuick === item.id ? "primary" : ""}" data-action="ledger-board-quick" data-range="${escapeAttr(item.id)}">${escapeHtml(item.label)}</button>`).join("")}
              </div>
              <div class="ledger-date-row">
                <div class="field compact"><label>开始日期</label><input id="ledgerBoardFrom" type="date" value="${escapeAttr(ui.ledgerBoardFrom)}"></div>
                <div class="field compact"><label>结束日期</label><input id="ledgerBoardTo" type="date" value="${escapeAttr(ui.ledgerBoardTo)}"></div>
                <button class="btn" data-action="clear-ledger-board-dates">清空日期</button>
              </div>
            </div>
          </div>
          <div class="ledger-board-groups">
            ${ledgerBoardGroups(rows).map(group => `
              <section class="ledger-card-group">
                <div class="ledger-card-group-head">
                  <div>
                    <h3 class="ledger-group-title">${escapeHtml(group.title)}</h3>
                    <p class="ledger-group-desc">${escapeHtml(group.desc)}</p>
                  </div>
                  <span class="badge blue">${group.rows.length} 个账本</span>
                </div>
                <div class="ledger-card-grid">
                  ${group.rows.map(renderLedgerCard).join("")}
                </div>
              </section>
            `).join("")}
          </div>
        </section>
      `;
    }

    function renderBusinessFundingDetails() {
      const sourceRows = businessFundingRows();
      const rows = filteredRows(filterBusinessFundingRows(sourceRows));
      const summary = businessFundingSummary(rows);
      const coverageChips = businessFundingProfiles()
        .map(profile => `<span class="business-coverage-chip">${escapeHtml(profile.type)}</span>`)
        .join("");
      return `
        ${renderPageHead("业务资金明细", "按我们实际业务列出每一笔资金变动，让财务直接看清来源、去向、余额、账本、凭证和核销。", `
          <button class="btn" data-action="export-view">导出业务资金明细</button>
        `)}
        <div class="metrics">
          ${metric("资金事件", rows.length, "当前筛选", "info")}
          ${metric("交易金额", fmtMoney(summary.amount), "业务原始金额", "good")}
          ${metric("手续费", fmtMoney(summary.fee), "充提与三方费用", "warn")}
          ${metric("借贷平衡", summary.balanced, "已形成平衡凭证", "good")}
          ${metric("未核销/差异", summary.unreconciled, "待核销、差异、需确认", summary.unreconciled ? "warn" : "good")}
          ${metric("后端待补", summary.backendPending, "部分落账或待落地", summary.backendPending ? "warn" : "good")}
        </div>
        ${renderBusinessFundingFilters(sourceRows)}
        <div class="panel business-coverage-panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">已覆盖业务资金变动</h2>
              <span class="panel-meta">这些标签代表主表已按实际业务事件挂到账本、凭证和核销关系。</span>
            </div>
            <span class="badge blue">${businessFundingProfiles().length} 类事件</span>
          </div>
          <div class="business-coverage-strip">${coverageChips}</div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">每笔业务资金变动</h2>
              <span class="panel-meta">主表只展示财务看账字段；源表、模板编码、交易类型等技术字段在详情查看。</span>
            </div>
            <span class="badge teal">源单 -> 凭证 -> 账本 -> 核销</span>
          </div>
          ${renderTable({
            id: "business-funding-details",
            rows,
              columns: ["业务时间","业务单号","业务类型","站点ID","站点名称","发起主体身份","发起主体ID","发起主体名称","代理ID","代理名称","会员ID","会员名称","资金方向","交易金额","手续费","实际入账/出款","影响余额","影响控制台账","关联账本","凭证号","借贷状态","核销状态","后端落账状态","财务处理建议"],
            actions: row => renderBusinessFundingActions(row)
          })}
        </div>
      `;
    }

    function renderBusinessFundingActions(row) {
      const actions = [`<button class="btn sm" data-action="detail-business-funding" data-id="${escapeAttr(row._id)}">资金链路</button>`];
      if (row._voucherNo) actions.push(`<button class="btn sm" data-action="detail-voucher" data-id="${escapeAttr(row._voucherNo)}">凭证</button>`);
      if (row._ledgerRecordId) actions.push(`<button class="btn sm" data-action="detail-ledger" data-id="${escapeAttr(row._ledgerRecordId)}">账本</button>`);
      if (row._reconciliationId) actions.push(`<button class="btn sm" data-action="detail-reconciliation" data-id="${escapeAttr(row._reconciliationId)}">核销</button>`);
      return actions.join("");
    }

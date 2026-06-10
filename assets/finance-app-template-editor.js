"use strict";

function configSheetRows(sheet) {
  if (sheet === "会计模板") return state.templates || [];
  if (sheet === "会计分录") return entryDisplayRows(state.entries || []);
  if (sheet === "凭证生成规则") return state.voucherRules || [];
  return excel[sheet] || [];
}

function entryDisplayRows(rows) {
  const stepById = entryStepNumberMap(rows);
  return (rows || []).map(row => entryDisplayRow(row, stepById.get(row.entryLineId) || 1));
}

function entryStepNumberMap(rows) {
  const grouped = groupBy(rows || [], "模板编码");
  const map = new Map();
  Object.values(grouped).forEach(items => {
    items
      .slice()
      .sort((a, b) => compareEntryLineOrder(a, b))
      .forEach((row, index) => map.set(row.entryLineId, index + 1));
  });
  return map;
}

function compareEntryLineOrder(a, b) {
  const lineCompare = compare(Number(a.行号 || 0), Number(b.行号 || 0));
  if (lineCompare) return lineCompare;
  return compare(String(a.entryLineId || ""), String(b.entryLineId || ""));
}

function entryDisplayRow(row, stepNo) {
  const { 行号, 模板编码, entryLineId, ...rest } = row;
  return {
    模板编码,
    分录步骤编号: stepNo,
    分录序号: Number(行号 || stepNo),
    ...rest,
    分录性质: entryNatureLabel(row),
    "账本/账户": entrySubjectLabel(row),
    进入报表: entryReportValue(row),
    entryLineId
  };
}

function entrySubjectLabel(row) {
  return [row?.科目编码, row?.科目名称].filter(Boolean).join(" ") || row?.引用模板 || "-";
}

function entryNatureLabel(row) {
  return row?.是否正式分录 === "否" || String(row?.科目编码 || "").startsWith("9") ? "信用台账" : "正式分录";
}

function entryReportValue(row) {
  if (String(row?.科目编码 || "").startsWith("9")) return "否";
  if (row?.进入报表) return row.进入报表;
  return entryNatureLabel(row) === "正式分录" ? "是" : "否";
}

function entryUpdateFlowValue(row) {
  if (row?.更新账户流水) return row.更新账户流水;
  if (/核对|状态变更|引用/.test(String(row?.["借贷/信用方向"] || ""))) return "否";
  return row?.源表 ? "是" : "否";
}

function uniqueTemplateOptions(values, current = "") {
  const list = Array.from(new Set([...(values || []), current].map(value => String(value || "").trim()).filter(Boolean))).sort(compare);
  return list.length ? list : ["-"];
}

function renderTemplateOptions(options, selected) {
  const values = uniqueTemplateOptions(options, selected);
  const blankOption = selected ? "" : `<option value="" selected>不适用</option>`;
  return `${blankOption}${values.map(option => `<option value="${escapeAttr(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}`;
}

function renderTemplateSelect(id, label, options, selected, extraClass = "") {
  return `
    <div class="field ${extraClass}">
      <label>${escapeHtml(label)}</label>
      <select id="${escapeAttr(id)}">
        ${renderTemplateOptions(options, selected)}
      </select>
    </div>
  `;
}

function subjectByCode(code) {
  return (state.subjects || []).find(row => String(row.科目编码) === String(code) || String(row.原始科目编码) === String(code));
}

function renderSubjectSelect(row) {
  const subjects = (state.subjects || []).map(subject => ({
    value: subject.科目编码,
    label: `${subject.科目编码} ${subject.科目名称}`
  }));
  if (row.科目编码 && !subjects.some(subject => String(subject.value) === String(row.科目编码))) {
    subjects.push({ value: row.科目编码, label: entrySubjectLabel(row) });
  }
  return `
    <div class="field">
      <label>账本/账户</label>
      <select id="editEntrySubjectCodeSelect">
        ${subjects.map(subject => `<option value="${escapeAttr(subject.value)}" ${String(subject.value) === String(row.科目编码 || "") ? "selected" : ""}>${escapeHtml(subject.label)}</option>`).join("")}
      </select>
    </div>
  `;
}

function templateEntryRawRows(templateCode) {
  const codes = resolveTemplateCodes(templateCode);
  return (state.entries || []).filter(row => codes.some(code => templateMatches(row.模板编码, [code])) || row.模板编码 === templateCode);
}

function templateEntryOptionPool(template, entryRows, row) {
  const rawRows = templateEntryRawRows(template.模板编码);
  const allEntries = state.entries || [];
  const subjectTypes = (state.subjects || []).map(subject => subject.科目类型);
  const ledgerModules = [
    ...(state.ledgerDefinitions || []).map(item => item.模块),
    ...(state.fundModuleDict || []).map(item => item.资金模块),
    ...allEntries.map(item => item.影响模块)
  ];
  const amountVariables = ["G", "F", "A", "W", "N", "bonus", "prepaid", "frozen", "refund", "OF", "VF", "rent", "siteShare", "mainShare", "settle", "commission", "gameAmount"];
  const maxLineNo = Math.max(entryRows.length + 1, ...entryRows.map(item => Number(item.分录序号 || 0)), Number(row.分录序号 || row.行号 || 1));
  return {
    lineNumbers: Array.from({ length: maxLineNo }, (_, index) => String(index + 1)),
    nature: ["正式分录", "信用台账"],
    sourceTables: uniqueTemplateOptions([...allEntries.map(item => item.源表), ...(state.ledgerDefinitions || []).flatMap(item => [item.源表, item.建议表名])], row.源表),
    sourceFields: uniqueTemplateOptions(allEntries.map(item => item.源字段), row.源字段),
    groups: uniqueTemplateOptions([...rawRows.map(item => item.分录组), `GRP-${template.模板编码}`], row.分录组 || `GRP-${template.模板编码}`),
    modules: uniqueTemplateOptions(ledgerModules, row.影响模块 || row.matrixAction || template.业务名称),
    objects: uniqueTemplateOptions([...allEntries.map(item => item.主体), ...(state.subjects || []).map(item => item.对应主体)], row.主体),
    subjectTypes: uniqueTemplateOptions(subjectTypes, row.科目类型),
    directions: uniqueTemplateOptions(allEntries.map(item => item["借贷/信用方向"]), row["借贷/信用方向"]),
    amountExpressions: uniqueTemplateOptions([...allEntries.map(item => item.金额表达式), ...amountVariables], row.金额表达式),
    behaviors: uniqueTemplateOptions(allEntries.map(item => item["来源/去向"]), row["来源/去向"]),
    balanceImpacts: uniqueTemplateOptions(allEntries.map(item => item.当前系统事实), row.当前系统事实),
    yesNo: ["是", "否"],
    balanceStatuses: uniqueTemplateOptions(allEntries.map(item => item.当前是否覆盖), row.余额更新状态 || row.当前是否覆盖),
    notes: uniqueTemplateOptions(allEntries.map(item => item.备注), row.备注)
  };
}

function activeTemplateEntryRow(entryRows) {
  if (!entryRows.length) return null;
  const selected = entryRows.find(row => row.entryLineId === ui.templateEntryEditId);
  if (selected) return selected;
  ui.templateEntryEditId = entryRows[0].entryLineId;
  return entryRows[0];
}

function renderTemplateEditor(rows) {
  const templates = filteredRows(rows);
  const templateCodes = new Set(templates.map(row => row.模板编码).filter(Boolean));
  const entryRows = (state.entries || []).filter(row => templateCodes.has(row.模板编码));
  const formalRows = entryRows.filter(row => row.是否正式分录 !== "否" && !String(row.科目编码 || "").startsWith("9"));
  const creditRows = entryRows.filter(row => row.是否正式分录 === "否" || String(row.科目编码 || "").startsWith("9"));
  return `
    <div class="metrics">
      ${metric("模板数量", templates.length, "当前筛选结果", "info")}
      ${metric("分录行", entryRows.length, "全部模板合计", "good")}
      ${metric("正式行", formalRows.length, "参与借贷平衡", "good")}
      ${metric("信用行", creditRows.length, "不进借贷平衡", "warn")}
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">会计模板列表</h2>
          <span class="panel-meta">默认展示全部模板；点“详情”后在抽屉中维护该模板的分录行。</span>
        </div>
        <span class="badge blue">${templates.length} 条</span>
      </div>
      ${renderTable({
        id: "template-master-list",
        rows: templateListRows(templates),
        columns: templateListColumns(),
        actions: row => `<button class="btn sm primary" data-action="detail-template" data-template="${escapeAttr(row.模板编码)}">详情</button>`
      })}
    </div>
  `;
}

function templateListColumns() {
  return ["业务名称", "模板编码", "模板性质", "触发状态", "金额表达式", "会计步骤说明", "标准会计处理"];
}

function templateListRows(templates) {
  return templates.map(row => ({
    ...row,
    会计步骤说明: templateAccountingSteps(row.模板编码)
  }));
}

function templateAccountingSteps(templateCode) {
  const rows = templateEntryRows(templateCode);
  if (!rows.length) return "待配置分录行";
  const steps = rows.slice(0, 5).map(row => {
    const direction = row["借贷/信用方向"] || (row.是否正式分录 === "否" ? "信用" : "");
    const subject = row.科目名称 || row.引用模板 || row.科目编码 || "待选择科目";
    const expression = row.金额表达式 ? `（${row.金额表达式}）` : "";
    const scope = row.是否正式分录 === "否" || String(row.科目编码 || "").startsWith("9") ? "信用台账" : "正式分录";
    return `${row.分录步骤编号 || "-"} ${direction} ${subject}${expression} ${scope}`;
  });
  return rows.length > steps.length ? `${steps.join("；")}；等 ${rows.length} 条分录` : steps.join("；");
}

function templateEntryRows(templateCode) {
  if (!templateCode) return [];
  const codes = resolveTemplateCodes(templateCode);
  const rows = (state.entries || []).filter(row => codes.some(code => templateMatches(row.模板编码, [code])) || row.模板编码 === templateCode)
    .slice()
    .sort((a, b) => Number(a.行号 || 0) - Number(b.行号 || 0));
  return entryDisplayRows(rows);
}

function showTemplateDetailDrawer(templateCode) {
  const template = (state.templates || []).find(row => row.模板编码 === templateCode);
  if (!template) return;
  ui.templateEditCode = templateCode;
  openDrawer("会计模板详情", renderTemplateDetail(template, templateEntryRows(templateCode)));
}

function renderTemplateDetail(template, entryRows) {
  const templateCode = template.模板编码 || "";
  const activeRow = activeTemplateEntryRow(entryRows);
  return `
    <div class="metrics">
      ${metric("分录行", entryRows.length, templateCode, entryRows.length ? "good" : "warn")}
      ${metric("正式行", entryRows.filter(row => row.是否正式分录 !== "否" && !String(row.科目编码 || "").startsWith("9")).length, "参与借贷平衡", "good")}
      ${metric("信用行", entryRows.filter(row => row.是否正式分录 === "否" || String(row.科目编码 || "").startsWith("9")).length, "不进借贷平衡", "warn")}
    </div>
    <div class="locked-note">模板主列表默认只展示概要；这里按步骤维护该模板对应的会计分录行。所有字段均为现有业务下拉选项，保存后会重建演示凭证和报表口径。</div>
    ${detailList(template, ["业务名称","模板编码","模板性质","触发状态","金额表达式","覆盖状态","标准会计处理","补记建议"])}
    ${renderTemplateEntryStepEditor(template, entryRows, activeRow)}
    <div class="panel drawer-panel">
      <div class="panel-head">
        <div><h2 class="panel-title">模板分录行</h2><span class="panel-meta">分录步骤编号为连续展示顺序；点击“编辑”会切换上方步骤面板。</span></div>
      </div>
      ${renderTable({
        id: `template-entry-${templateCode || "empty"}`,
        rows: entryRows,
        columns: ["分录步骤编号","分录序号","分录组","分录性质","借贷/信用方向","账本/账户","科目类型","金额表达式","影响模块","主体","源表","源字段","进入报表"],
        actions: row => `
          <button class="btn sm ${row.entryLineId === activeRow?.entryLineId ? "primary" : ""}" data-action="edit-template-entry" data-id="${escapeAttr(row.entryLineId)}">${row.entryLineId === activeRow?.entryLineId ? "编辑中" : "编辑"}</button>
          <button class="btn sm" data-action="clone-template-entry" data-id="${escapeAttr(row.entryLineId)}">复制</button>
          <button class="btn sm danger" data-action="delete-template-entry" data-id="${escapeAttr(row.entryLineId)}">删除</button>
        `
      })}
    </div>
  `;
}

function renderTemplateEntryStepEditor(template, entryRows, row) {
  const templateCode = template.模板编码 || "";
  if (!row) {
    return `
      <div class="panel drawer-panel template-step-editor">
        <div class="template-step-toolbar">
          <div><h2 class="panel-title">编辑步骤</h2><span class="panel-meta">当前模板暂无分录步骤。</span></div>
          <button class="btn primary" data-action="add-template-entry" data-template="${escapeAttr(templateCode)}">新增步骤</button>
        </div>
      </div>
    `;
  }
  const options = templateEntryOptionPool(template, entryRows, row);
  const subject = subjectByCode(row.科目编码) || {};
  const subjectType = subject.科目类型 || row.科目类型 || "";
  const nature = String(row.科目编码 || "").startsWith("9") ? "信用台账" : entryNatureLabel(row);
  const report = String(row.科目编码 || "").startsWith("9") ? "否" : entryReportValue(row);
  const balanceStatus = row.余额更新状态 || row.当前是否覆盖 || "";
  return `
    <div class="panel drawer-panel template-step-editor">
      <div class="template-step-toolbar">
        <div>
          <h2 class="panel-title">编辑步骤</h2>
          <span class="panel-meta">当前编辑 ${escapeHtml(row.分录步骤编号 || row.分录序号 || row.行号 || "-")} / ${entryRows.length}，字段均来自现有业务配置。</span>
        </div>
        <div class="template-step-controls">
          <div class="field compact">
            <label>选择步骤</label>
            <select id="templateEntryStepSelect">
              ${entryRows.map(item => `<option value="${escapeAttr(item.entryLineId)}" ${item.entryLineId === row.entryLineId ? "selected" : ""}>第 ${escapeHtml(item.分录步骤编号)} 步 · ${escapeHtml(item.科目名称 || item.引用模板 || item.科目编码 || "未命名")}</option>`).join("")}
            </select>
          </div>
          <button class="btn primary" data-action="add-template-entry" data-template="${escapeAttr(templateCode)}">新增步骤</button>
        </div>
      </div>
      <div class="template-step-grid">
        ${renderTemplateSelect("editEntryLineNoSelect", "分录步骤号", options.lineNumbers, String(row.分录序号 || row.行号 || row.分录步骤编号 || "1"))}
        ${renderTemplateSelect("editEntryNatureSelect", "分录性质", options.nature, nature)}
        ${renderTemplateSelect("editEntrySourceTableSelect", "来源/源表", options.sourceTables, row.源表 || "")}
        ${renderTemplateSelect("editEntryGroupSelect", "分录组", options.groups, row.分录组 || `GRP-${templateCode}`)}
        ${renderTemplateSelect("editEntryImpactModuleSelect", "影响模块", options.modules, row.影响模块 || row.matrixAction || template.业务名称 || "")}
        ${renderSubjectSelect(row)}
        ${renderTemplateSelect("editEntryObjectSelect", "对象", options.objects, row.主体 || "")}
        ${renderTemplateSelect("editEntrySubjectTypeSelect", "科目类型", options.subjectTypes, subjectType)}
        ${renderTemplateSelect("editEntryDirectionSelect", "借贷/控制方向", options.directions, row["借贷/信用方向"] || "")}
        ${renderTemplateSelect("editEntryAmountExprSelect", "金额公式", options.amountExpressions, row.金额表达式 || "")}
        ${renderTemplateSelect("editEntryBehaviorSelect", "具体行为", options.behaviors, row["来源/去向"] || "")}
        ${renderTemplateSelect("editEntrySourceFieldSelect", "来源字段", options.sourceFields, row.源字段 || "")}
        ${renderTemplateSelect("editEntryBalanceImpactSelect", "余额影响", options.balanceImpacts, row.当前系统事实 || "")}
        ${renderTemplateSelect("editEntryUpdateFlowSelect", "更新账户流水", options.yesNo, entryUpdateFlowValue(row))}
        ${renderTemplateSelect("editEntryReportSelect", "进入报表", options.yesNo, report)}
        ${renderTemplateSelect("editEntryBalanceStatusSelect", "余额更新状态", options.balanceStatuses, balanceStatus)}
        ${renderTemplateSelect("editEntryNoteSelect", "备注", options.notes, row.备注 || "")}
      </div>
      <div class="action-bar">
        <button class="btn primary" data-action="save-template-entry" data-id="${escapeAttr(row.entryLineId)}">保存步骤</button>
      </div>
    </div>
  `;
}

function addTemplateEntryLine(templateCode) {
  if (!templateCode) return;
  const rows = templateEntryRows(templateCode);
  const last = rows[rows.length - 1] || {};
  const nextLineNo = rows.reduce((max, row) => Math.max(max, Number(row.分录序号 || 0)), 0) + 1;
  const subject = subjectByCode(last.科目编码) || state.subjects[0] || {};
  const sourceTable = last.源表 || uniqueTemplateOptions((state.entries || []).map(row => row.源表))[0] || "";
  const sourceField = last.源字段 || uniqueTemplateOptions((state.entries || []).map(row => row.源字段))[0] || "";
  const newRow = normalizeEntryRow({
    模板编码: templateCode,
    行号: nextLineNo,
    "借贷/信用方向": last["借贷/信用方向"] || "借",
    科目编码: subject.科目编码 || last.科目编码 || "100101",
    引用模板: "",
    科目名称: subject.科目名称 || last.科目名称 || "官方收款账户",
    科目类型: subject.科目类型 || last.科目类型 || "资产",
    金额表达式: last.金额表达式 || "G",
    分录组: last.分录组 || `GRP-${templateCode}`,
    影响模块: last.影响模块 || last.matrixAction || businessNameFor(templateCode),
    主体: last.主体 || subject.对应主体 || "总站/官方收款",
    "来源/去向": last["来源/去向"] || "",
    源表: sourceTable,
    源字段: sourceField,
    是否正式分录: last.是否正式分录 || "是",
    更新账户流水: last.更新账户流水 || "是",
    进入报表: last.进入报表 || "是",
    余额更新状态: last.余额更新状态 || last.当前是否覆盖 || "是",
    当前是否覆盖: "会计调整",
    备注: last.备注 || ""
  }, state.entries.length + 1);
  newRow.entryLineId = `ENTRY-CUSTOM-${Date.now()}`;
  state.entries.push(newRow);
  ui.templateEntryEditId = newRow.entryLineId;
  rebuildAccountingFromTemplateEditor(`新增 ${templateCode} 第 ${nextLineNo} 条分录`, templateCode);
  showTemplateDetailDrawer(templateCode);
  toast("分录行已新增");
}

function cloneTemplateEntryLine(id) {
  const row = state.entries.find(item => item.entryLineId === id);
  if (!row) return;
  const copy = normalizeEntryRow({ ...row, 行号: Number(row.行号 || 0) + 1, 备注: [row.备注, "复制新增"].filter(Boolean).join("；") }, state.entries.length + 1);
  copy.entryLineId = `ENTRY-CUSTOM-${Date.now()}`;
  state.entries.push(copy);
  ui.templateEntryEditId = copy.entryLineId;
  rebuildAccountingFromTemplateEditor(`复制 ${row.模板编码} 第 ${row.行号} 条分录`, row.模板编码);
  showTemplateDetailDrawer(row.模板编码);
  toast("分录行已复制");
}

function deleteTemplateEntryLine(id) {
  const row = state.entries.find(item => item.entryLineId === id);
  if (!row) return;
  state.entries = state.entries.filter(item => item.entryLineId !== id);
  const remaining = templateEntryRows(row.模板编码);
  ui.templateEntryEditId = remaining[0]?.entryLineId || "";
  rebuildAccountingFromTemplateEditor(`删除 ${row.模板编码} 第 ${row.行号} 条分录`, row.模板编码);
  showTemplateDetailDrawer(row.模板编码);
  toast("分录行已删除");
}

function showTemplateEntryEditor(id) {
  const row = state.entries.find(item => item.entryLineId === id);
  if (!row) return;
  ui.templateEntryEditId = id;
  showTemplateDetailDrawer(row.模板编码);
}

function saveTemplateEntryLine(id) {
  const index = state.entries.findIndex(item => item.entryLineId === id);
  if (index < 0) return;
  const current = state.entries[index];
  const subjectCode = $("#editEntrySubjectCodeSelect")?.value || current.科目编码 || "";
  const subject = subjectByCode(subjectCode) || {};
  const isCreditSubject = String(subjectCode || "").startsWith("9");
  const nature = $("#editEntryNatureSelect")?.value || entryNatureLabel(current);
  const reportValue = isCreditSubject || nature === "信用台账" ? "否" : ($("#editEntryReportSelect")?.value || "是");
  const isFormal = !isCreditSubject && nature === "正式分录" && reportValue === "是";
  const lineNo = Number($("#editEntryLineNoSelect")?.value || current.行号 || 0);
  const next = {
    ...current,
    行号: Number.isFinite(lineNo) && lineNo > 0 ? lineNo : current.行号,
    分录组: $("#editEntryGroupSelect")?.value || current.分录组 || "",
    影响模块: $("#editEntryImpactModuleSelect")?.value || current.影响模块 || "",
    "借贷/信用方向": $("#editEntryDirectionSelect")?.value || current["借贷/信用方向"] || "",
    科目编码: subject.科目编码 || subjectCode,
    科目名称: subject.科目名称 || current.科目名称 || "",
    科目类型: subject.科目类型 || $("#editEntrySubjectTypeSelect")?.value || current.科目类型 || "",
    金额表达式: $("#editEntryAmountExprSelect")?.value || current.金额表达式 || "",
    主体: $("#editEntryObjectSelect")?.value || current.主体 || "",
    "来源/去向": $("#editEntryBehaviorSelect")?.value || current["来源/去向"] || "",
    源表: $("#editEntrySourceTableSelect")?.value || current.源表 || "",
    源字段: $("#editEntrySourceFieldSelect")?.value || current.源字段 || "",
    是否正式分录: isFormal ? "是" : "否",
    更新账户流水: $("#editEntryUpdateFlowSelect")?.value || current.更新账户流水 || "",
    进入报表: reportValue,
    余额更新状态: $("#editEntryBalanceStatusSelect")?.value || current.余额更新状态 || current.当前是否覆盖 || "",
    当前是否覆盖: $("#editEntryBalanceStatusSelect")?.value || current.当前是否覆盖 || "",
    当前系统事实: $("#editEntryBalanceImpactSelect")?.value || current.当前系统事实 || "",
    备注: $("#editEntryNoteSelect")?.value || current.备注 || ""
  };
  next.entryLineId = id;
  state.entries[index] = normalizeEntryRow(next, index);
  ui.templateEntryEditId = id;
  rebuildAccountingFromTemplateEditor(`修改 ${next.模板编码 || ""} 第 ${next.行号 || ""} 条分录`, next.模板编码);
  showTemplateDetailDrawer(next.模板编码);
  toast("分录行已保存");
}

function syncTemplateEntrySubjectControls() {
  const subjectCode = $("#editEntrySubjectCodeSelect")?.value || "";
  const subject = subjectByCode(subjectCode) || {};
  const isCredit = String(subjectCode).startsWith("9") || subject.科目类型 === "信用类" || subject.是否进正式分录 === "否";
  const subjectTypeSelect = $("#editEntrySubjectTypeSelect");
  const natureSelect = $("#editEntryNatureSelect");
  const reportSelect = $("#editEntryReportSelect");
  if (subjectTypeSelect && subject.科目类型) subjectTypeSelect.value = subject.科目类型;
  if (natureSelect) natureSelect.value = isCredit ? "信用台账" : "正式分录";
  if (reportSelect) reportSelect.value = isCredit ? "否" : "是";
}

function syncTemplateEntryNatureControls() {
  const subjectCode = $("#editEntrySubjectCodeSelect")?.value || "";
  const isCreditSubject = String(subjectCode).startsWith("9");
  const natureSelect = $("#editEntryNatureSelect");
  const reportSelect = $("#editEntryReportSelect");
  if (isCreditSubject && natureSelect) natureSelect.value = "信用台账";
  if (reportSelect && (isCreditSubject || natureSelect?.value === "信用台账")) reportSelect.value = "否";
}

function rebuildAccountingFromTemplateEditor(result, templateCode = ui.templateEditCode) {
  ui.templateEditCode = templateCode || ui.templateEditCode;
  state.voucherBatches = seedVouchers(subjectLookup(state.subjects), state.entries, state.voucherRules);
  state.auditTrail.unshift({ time: now(), actor: "会计配置", action: "调整会计分录行", target: templateCode || "会计模板", result });
  saveState();
  render();
}

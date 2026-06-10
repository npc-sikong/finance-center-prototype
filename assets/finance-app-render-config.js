"use strict";

function renderConfig() {
  if (!configSheets.includes(ui.configSheet)) ui.configSheet = "会计模板";
  const isSubjectCodeSheet = ui.configSheet === "科目编码";
  const isTemplateSheet = ui.configSheet === "会计模板";
  const activeGroup = configGroupForSheet(ui.configSheet);
  const rows = isSubjectCodeSheet ? subjectCodeRows() : configSheetRows(ui.configSheet);
  return `
    ${renderPageHead("会计模板配置", "维护每笔资金变动入账所需的会计模板：业务事件、科目、模板、分录、凭证规则和账本映射。", `
      <button class="btn" data-action="export-view">导出当前表</button>
    `)}
    ${renderConfigGroupTabs(activeGroup)}
    ${renderTabs(activeGroup.sheets, ui.configSheet, "config-tab")}
    ${isSubjectCodeSheet ? renderSubjectCodeConfig(rows) : isTemplateSheet ? renderTemplateEditor(rows) : renderConfigSheet(rows)}
  `;
}

function configGroupForSheet(sheet) {
  return configGroups.find(group => group.sheets.includes(sheet)) || configGroups[0];
}

function renderConfigGroupTabs(activeGroup) {
  if (configGroups.length <= 1) return "";
  return `
    <div class="config-group-tabs">
      ${configGroups.map(group => `
        <button class="config-group-tab ${group.id === activeGroup.id ? "active" : ""}" data-action="config-group" data-id="${escapeAttr(group.id)}">
          <strong>${escapeHtml(group.label)}</strong>
          <span>${escapeHtml(group.desc)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderConfigSheet(rows) {
  return `
    <div class="panel">
      <div class="panel-head"><h2 class="panel-title">${escapeHtml(ui.configSheet)}</h2><span class="panel-meta">${rows.length} 条</span></div>
      ${renderTable({
        id: `config-${ui.configSheet}`,
        rows: filteredRows(rows),
        columns: preferredColumns(ui.configSheet, rows),
        actions: row => `<button class="btn sm" data-action="detail-config" data-sheet="${escapeAttr(ui.configSheet)}" data-row="${escapeAttr(rowKey(row))}">详情</button>`
      })}
    </div>
  `;
}

function subjectCodeRows() {
  return state.subjects.map(row => ({
    subjectId: row.subjectId,
    原始科目编码: row.原始科目编码,
    当前科目编码: row.科目编码,
    科目名称: row.科目名称,
    科目类型: row.科目类型,
    对应主体: row.对应主体,
    辅助核算维度: row.辅助核算维度,
    是否进正式分录: row.是否进正式分录,
    生产控制要求: row.生产控制要求,
    编码状态: row.科目编码 === row.原始科目编码 ? "原始" : "已调整",
    编码更新时间: row.编码更新时间 || "-"
  }));
}

function renderSubjectCodeConfig(sourceRows) {
  const rows = filteredRows(sourceRows);
  const editedRows = rows.filter(row => row.编码状态 === "已调整");
  return `
    <div class="metrics">
      ${metric("科目数量", state.subjects.length, "来自会计科目表", "info")}
      ${metric("已调整编码", editedRows.length, "名称保持锁定", editedRows.length ? "warn" : "good")}
      ${metric("正式科目", state.subjects.filter(row => row.是否进正式分录 === "是").length, "资产/负债/收入/成本", "good")}
      ${metric("信用台账科目", state.subjects.filter(row => String(row.科目类型).includes("信用")).length, "900xxx 信用类", "warn")}
      ${metric("生产控制", state.subjects.filter(row => row.生产控制要求).length, "启停/审批/锁账", "info")}
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">科目编码与名称锁定关系</h2>
          <span class="panel-meta">修改编码只写入演示状态；生产需启用日期、停用日期、版本、审批记录和锁账限制。</span>
        </div>
        <span class="badge teal">名称锁定 / 生产受控</span>
      </div>
      ${renderTable({
        id: "subject-code-manager",
        rows,
        columns: ["原始科目编码","当前科目编码","科目名称","科目类型","对应主体","辅助核算维度","是否进正式分录","生产控制要求","编码状态","编码更新时间"],
        actions: row => `
          <button class="btn sm primary" data-action="edit-subject-code" data-id="${escapeAttr(row.subjectId)}">修改编码</button>
          <button class="btn sm" data-action="detail-subject-code" data-id="${escapeAttr(row.subjectId)}">详情</button>
        `
      })}
    </div>
  `;
}

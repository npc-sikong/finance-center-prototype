"use strict";

function financeActivitySummary() {
  const formal = formalSummary();
  const creditRows = controlReportRows();
  return {
    actions: (state.actionOverview || []).length,
    impacts: (state.fundImpactDetails || []).length,
    modules: (state.fundModuleDict || []).length,
    balanced: formal.balanced,
    creditNet: sum(creditRows, "netChange")
  };
}

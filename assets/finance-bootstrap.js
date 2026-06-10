"use strict";

const state = loadState();
window.state = state;
const defaultLedgerDefinition = typeof ledgerCenterDefinitions === "function" ? ledgerCenterDefinitions()[0] : state.ledgerDefinitions[0];
if (!ui.ledgerTab && defaultLedgerDefinition) ui.ledgerTab = defaultLedgerDefinition.模块;
if (!ui.selectedVoucher && state.voucherBatches[0]) ui.selectedVoucher = state.voucherBatches[0].voucherNo;

render();

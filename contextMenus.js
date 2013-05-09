chrome.contextMenus.create({"title": "Encrypt selection", "contexts":["selection"],"onclick": requestEncryptSelection});
chrome.contextMenus.create({"title": "Encrypt", "contexts":["editable"], "onclick": requestEncryptEditable});

function requestEncryptSelection(info, tab) {
	chrome.tabs.sendMessage(tab.id, {object: "encryptSelection", selection:info.selectionText});
	console.log(tab.id);
}

function requestEncryptEditable(info, tab) {
	chrome.tabs.sendMessage(tab.id, {object: "encryptEditable", selection:info.selectionText});
}

document.getElementById('btn_addPrivateKey').addEventListener('click', function (e) {
	chrome.runtime.sendMessage({object: "addPrivateKey", privateKey: document.getElementById('privateKey').value}, function(response) {
		console.log(response);
	});
});

document.getElementById('btn_addPublicKey').addEventListener('click', function (e) {
	chrome.runtime.sendMessage({object: "addPublicKey", publicKey: document.getElementById('publicKey').value}, function(response) {
		console.log(response);
	});
});

document.getElementById('btn_decryptMessage').addEventListener('click', function (e) {
	chrome.runtime.sendMessage({object: "decryptMessage", message: document.getElementById('message').value}, function(response) {
		console.log(response);
	});
});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		switch(request.object){
			case "privateKeyPass":
				console.log("We need a pass phrase for that private key.");
				document.getElementById('btn_sendPass').addEventListener('click', function (e) {
					sendResponse({cancelled:false, pass:document.getElementById('pass').value});
					unbind(document.getElementById('btn_sendPass'));
					unbind(document.getElementById('btn_cancel'));
				});
				document.getElementById('btn_cancel').addEventListener('click', function (e) {
					sendResponse({cancelled:true});
					unbind(document.getElementById('btn_sendPass'));
					unbind(document.getElementById('btn_cancel'));
				});
			break;
			default:
				console.log("Unknow !");
		}
		return true;
	}
);

function unbind(ele){
	ele.parentNode.replaceChild(ele.cloneNode(true), ele);
}
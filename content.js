var passRequests = [];
var lastRightClickedElement = document.documentElement;

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		switch(request.object){
			case "privateKeyPass":
				showPassBox(sendResponse);
			break;
			default:
		}

		return true;
	}
);

var container = document.createElement("div");
container.setAttribute("id", "PGP-chr");
document.body.appendChild(container);

var passBox = document.createElement('aside');
var cross = document.createElement('img');
var passInput = document.createElement('input');
var cancelButton = document.createElement('button');
var sendPassButton = document.createElement('button');
var counter = document.createElement('span');
cross.setAttribute('src', chrome.extension.getURL('cross.png'));
cross.classList.add('cross');
counter.textContent = "1";
passInput.setAttribute('type', 'password');
cancelButton.textContent = "Cancel";
sendPassButton.textContent = "Decrypt";

passBox.appendChild(cross);
passBox.appendChild(document.createTextNode("We need your passphrase to decrypt messages on this page ("));
passBox.appendChild(counter);
passBox.appendChild(document.createTextNode(")."));
passBox.appendChild(passInput);
passBox.appendChild(cancelButton);
passBox.appendChild(sendPassButton);

sendPassButton.addEventListener("click", function (e) {
	for(var i = 0, len = passRequests.length; i < len; i++) {
		passRequests.pop()({cancelled:false, pass:passInput.value})
	}
	container.removeChild(passBox);
	passInput.value = "";
});

cancelButton.addEventListener("click", function (e) {
	for(var i = 0, len = passRequests.length; i < len; i++) {
		passRequests.pop()({cancelled:true})
	}
	container.removeChild(passBox);
	passInput.value = "";
});

cross.addEventListener("click", function (e) {
	for(var i = 0, len = passRequests.length; i < len; i++) {
		passRequests.pop()({cancelled:true})
	}
	container.removeChild(passBox);
	passInput.value = "";
});

window.addEventListener('mousedown', function(e){
	if(e.button == 2){
		lastRightClickedElement = e.target;
		console.log([lastRightClickedElement]);
	}
});

function showPassBox(callback) {
	if(passRequests.length == 0){
		container.appendChild(passBox)
	}
	passRequests.push(callback);
	counter.textContent = passRequests.length;
	console.log(passRequests);
}

function findPGPBlocks(elem) {
	elem.normalize();

	var potentialMessage = new Array();
	var potentialPublic = new Array();
	for(var i = 0, len = elem.childNodes.length; i < len; i++) {
		if(elem.childNodes[i].nodeType == 3){
			if(elem.childNodes[i].textContent.trim() != ""){

				if(elem.childNodes[i].textContent.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----") != -1){
					potentialPublic.push(elem.childNodes[i]);
				}else if(elem.childNodes[i].textContent.indexOf("-----BEGIN PGP MESSAGE-----") != -1){
					potentialMessage.push(elem.childNodes[i]);
				}
			}
		}else {
			nodes = findPGPBlocks(elem.childNodes[i])
			potentialMessage = potentialMessage.concat(nodes.potentialMessage);
			potentialPublic = potentialPublic.concat(nodes.potentialPublic);
		}
	}
	return {potentialMessage:potentialMessage,potentialPublic:potentialPublic};
}


function tick () {
	var blocks = findPGPBlocks(document.documentElement);
}

tick();
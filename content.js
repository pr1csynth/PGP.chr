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

function findPGPBlocks(el) {
	el.normalize();

	function findInTextNodes(elem) {
		for(var i = 0, len = elem.childNodes.length; i < len; i++) {
			if(elem.childNodes[i].nodeType == 3){
				if(elem.childNodes[i].textContent.trim() != ""){
					if(elem.childNodes[i].textContent.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----") != -1){
						requestPublicKeyAdd(elem.childNodes[i].textContent);
					}else if(elem.childNodes[i].textContent.indexOf("-----BEGIN PGP MESSAGE-----") != -1){
						decryptElement(elem.childNodes[i]);
					}
				}
			}else {
				nodes = findInTextNodes(elem.childNodes[i])
			}
		}
	}

	findInTextNodes(el);

	var inputs = el.getElementsByTagName('input');
	inputs.concat(el.getElementsByTagName('textarea'));

	for(var i = 0, len = inputs.length; i < len; i++) {
		if(inputs[i].value.trim() != ""){
			if(inputs[i].value.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----") != -1){
				requestPublicKeyAdd(inputs[i].value);
			}else if(inputs[i].value.indexOf("-----BEGIN PGP MESSAGE-----") != -1){
				decryptElement(input[i]);
			}	
		}
	}
}

function decryptElement(el){
	if(el.tagName == "INPUT"){
		chrome.runtime.sendMessage({object: "decryptMessage", message: filter(el.value, "message")}, function(response) {
			console.log(response);
		});
	}else{
		chrome.runtime.sendMessage({object: "decryptMessage", message: filter(el.textContent, "message")}, function(response) {
			console.log(response);
		});
	}
}

function filter(string, type) {
	if(type == "message"){
		start = "-----BEGIN PGP MESSAGE-----";
		end = "-----END PGP MESSAGE-----";
	}else if(type == "key"){
		start = "-----BEGIN PGP PUBLIC KEY BLOCK-----";
		end = "-----END PGP PUBLIC KEY BLOCK-----";		
	}
	return start + string.split(start)[1].split(end)[0] + end;
}


function tick () {
	findPGPBlocks(document.documentElement);

}

tick();
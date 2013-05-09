openpgp.init();
var ready = false;

if(!localStorage.getItem("publicKeys")){
	localStorage.setItem("publicKeys",JSON.stringify({}));
}

if(localStorage.getItem("privateKey")){
	ready = true;
}

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		switch(request.object){
			case "genKeyPair":
				console.log("Unimplemented !");
			break;
			case "addPrivateKey":
				addPrivateKey(request, sendResponse);
			break;
			case "isReady":
				sendResponse({ready:ready});
			break;
			case "addPublicKey":
				addPublicKey(request, sendResponse);
			break;
			case "getPublicKeys":
				getPublicKeys(sendResponse);
			break;
			case "encryptMessage":
				encryptMessage(request, sendResponse);
			break;
			case "decryptMessage":
				decryptMessage(request, sender, sendResponse);
			break;
			default:
				console.log("Unknow !");
		}

		return true;
	}
);

function addPrivateKey (request, sendResponse) {
	try{
		var result = openpgp.read_privateKey(request.privateKey);
	}catch(e){
		result = null;
	}

	if(result == null){
		sendResponse({success:false});
	}else{
		sendResponse({success:true});
		var name ="";
		var first = true;
		var contacts = [];			
		for(user in result[0].userIds){	
			contact = readContact(result[0].userIds[user].text)		
			contacts.unshift(contact);
			if(first){
				name = contact.name;
				first = false;
			}else{
				name = contact.name + ", " + name;
			}
		}

		var privateKey = {key:request.privateKey, contacts:contacts};
		localStorage.setItem("privateKey", JSON.stringify(privateKey));
	}
}

function addPublicKey (request, sendResponse) {
	try{
		var result = openpgp.read_publicKey(request.publicKey);
	}catch(e){
		result = null;
	}

	if(result == null){
		sendResponse({success:false});
	}else{
		sendResponse({success:true});
		var publicKeys = JSON.parse(localStorage.getItem("publicKeys"));
		var name ="";
		var first = true;
		var contacts = [];
		for(key in result){
				
			for(user in result[key].userIds){	
				contact = readContact(result[key].userIds[user].text)		
				contacts.unshift(contact);
				if(first){
					name = contact.name;
					first = false;
				}else{
					name = contact.name + ", " + name;
				}
			}
		}
		publicKeys[name] = {key:request.publicKey, contacts:contacts};
		localStorage.setItem("publicKeys", JSON.stringify(publicKeys));
	}
}

function getPublicKeys(sendResponse){
	var publicKeys = JSON.parse(localStorage.getItem("publicKeys"));
	sendResponse({publicKeys:publicKeys});
}

function encryptMessage (request, sendResponse) {
	var publicKeys = JSON.parse(localStorage.getItem("publicKeys"));
	var publicKey = openpgp.read_publicKey(publicKeys[request.publicKey].key)[0];

	var text = openpgp.write_encrypted_message([publicKey], request.message);

	sendResponse({success:true, message:text});
}

function decryptMessage (request, sender, sendResponse) {
	try{
		var result = openpgp.read_message(request.message);
	}catch(e){
		result = null;
	}

	if(result == null){
		sendResponse({success:false, err:"Invalid message."});
	}else{
		if(ready){
			var message = result[0];
			var privateKey = openpgp.read_privateKey(JSON.parse(localStorage.getItem('privateKey')).key)[0];
			var publicKeys = openpgp.read_publicKey(privateKey.extractPublicKey());

			if(!privateKey.hasUnencryptedSecretKeyData){
				chrome.tabs.sendMessage(sender.tab.id, {object: "privateKeyPass"}, function(response) {
					if(!response.cancelled){
						if(privateKey.decryptSecretMPIs(response.pass)){
				
							var material = {key: privateKey , keymaterial: privateKey.privateKeyPacket};
							decrypt(response.pass,material, message, publicKeys, function (data) {
								if(data){
									sendResponse({success:true, message: data});	
								}else{
									sendResponse({success:false, err:"Unable to decrypt..."});	
								}
							});
						}else{
							sendResponse({success:false, err:"Bas pass."});
						}
					}else{
						sendResponse({success:false, err:"Cancelled."});
					}
				});
			}else{
				var material = {key: privateKey , keymaterial: privateKey.privateKeyPacket};
				decrypt("",material, message, publicKeys, function (data) {
					if(data){
						sendResponse({success:true, message: data});	
					}else{
						sendResponse({success:false, err:"Unable to decrypt..."});	
					}
				});
			}

		}else{
			sendResponse({success:false, err:"Private key not set."});
		}
	}
}

function decrypt(password, material, message, publicKeys, callback) {

	decryptHelper = function (msg, mat, session, publics, cb) {
		try{
			var decryptResult = msg.decrypt(mat, session);
			if(decryptResult.text !== ''){
				cb(decryptResult);
				return true;
			}else{
				return false;
			}
		}catch(e){ //This means that the initial key is not the one we need
    	}
		return false;
	}

	for(var sessionKeyIterator in message.sessionKeys){
		var sessionKey = message.sessionKeys[sessionKeyIterator];
		if(!decryptHelper(message, material, sessionKey, publicKeys, callback)){
			for (sub in material.key.subKeys) {
				var keymat = { key: material.key, keymaterial: material.key.subKeys[sub]};
				if(!keymat.keymaterial.hasUnencryptedSecretKeyData)
					keymat.keymaterial.decryptSecretMPIs(password);
				if(!decryptHelper(message, keymat, sessionKey, publicKeys, callback)){
					callback(false);
				}
			}
		}
	}
}


function readContact(text){
	var name, comment, mail;
	mail = text.split("<")[1].split(">")[0];

	if(text.indexOf('(') != -1){
		comment = text.split("(")[1].split(")")[0];
		name = text.split(" (")[0];
	}else{
		comment = "";
		name = text.split(" <")[0];
	}
	return {mail:mail,name:name,comment:comment};
}
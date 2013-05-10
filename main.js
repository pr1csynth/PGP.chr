openpgp.init();

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
		openpgp.keyring.importPrivateKey(request.privateKey);
		openpgp.keyring.store();
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
		openpgp.keyring.importPublicKey(request.publicKey);
		openpgp.keyring.store();
	}
}

function getPublicKeys(sendResponse){
	sendResponse({publicKeys:openpgp.keyring.publicKeys});
}

function encryptMessage (request, sendResponse) {

	publicKeys = openpgp.keyring.getPublicKeysForKeyId(request.publicKey);

	if(publicKeys.length == 0){
		var text = openpgp.write_encrypted_message(publicKeys, request.message);
		sendResponse({success:true, message:text});
	}else{
		sendResponse({success:false, err:"No public key with this id."});
	}
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
		if(openpgp.keyring.hasPrivateKey()){
			var message = result[0];
			var privateKey = openpgp.keyring.privateKeys[0];

			if(!privateKey.hasUnencryptedSecretKeyData){
				chrome.tabs.sendMessage(sender.tab.id, {object: "privateKeyPass"}, function(response) {
					if(!response.cancelled){
						if(privateKey.decryptSecretMPIs(response.pass)){
				
							var material = {key: privateKey , keymaterial: privateKey.privateKeyPacket};
							decrypt(response.pass,material, message, function (data) {
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
				decrypt("",material, message, function (data) {
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

function decrypt(password, material, message, callback) {

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
		if(!decryptHelper(message, material, sessionKey, callback)){
			for (sub in material.key.subKeys) {
				var keymat = { key: material.key, keymaterial: material.key.subKeys[sub]};
				if(!keymat.keymaterial.hasUnencryptedSecretKeyData)
					keymat.keymaterial.decryptSecretMPIs(password);
				if(!decryptHelper(message, keymat, sessionKey, callback)){
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
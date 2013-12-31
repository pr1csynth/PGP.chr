openpgp.init();

var debug_lastreadmessage = null;
var debug_lastreadpublickey = null;
var debug_lastreadprivatekey = null;

var colorShift = 9;

var storage = {
	"pending":{
		"private" : {},
		"public" : {},
		"message" : {}
	},
	"locked":{
		"private" : {}
	},
	"ready":{
		"private" : {},
		"public" : {}
	}
}

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		console.log(request);

		switch(request.object){
			case "blockScanResult":
				storeValidBlocks(request.payload, sendResponse);
				updatePopupBadge();
			break;
			case "setupPopup":
				sendResponse(setupPopup());
			break;
			case "ignoreMessage":
			case "ignorePublicKey":
			case "ignorePrivateKey":
				sendResponse({object:"closeItem", payload:request.payload});
				var type = request.object.split('ignore')[1].replace('Key', '').toLowerCase();
				if(storage.pending[type].hasOwnProperty(request.payload)){
					delete storage.pending[type][request.payload];
				}
				updatePopupBadge();
			break;
			case "importPublicKey":
				var pub = true;
			case "importPrivateKey":
	
				if(pub){
					id = request.payload;
				}else{
					id = request.payload.split('_')[1];
				}

				if(storage.pending[pub ? "public" : "private"].hasOwnProperty(id)){
					if(pub){
						for(i in storage.pending.public[id].subKeyIds)
							storage.ready.public[storage.pending.public[id].subKeyIds[i]] = storage.pending.public[id];
					}else{
						storage.locked.private[id] = storage.pending.private[id];
					}
					delete storage.pending[pub ? "public" : "private"][id];
				}

				updatePopupBadge();

				if(pub){
					sendResponse({object:"closeItem", payload:request.payload});
				}else{
					var newRequest = [
						{object:"closeItem", payload:request.payload},
						{object:"addItems"}
					];

					newRequest[1].payload = {};
					newRequest[1].payload['unlock_' + id] = genPopupItemAskForUnlock(id);
					newRequest[1].payload['unlock_' + id].before = request.payload;

					sendResponse(newRequest);
				}

			break;
			default:
				sendResponse(request);
			break;
		}

		return true;
	}
);

function storeValidBlocks(blocks, sendResponse) {

	for(i in blocks.public){
		var result = openpgp.read_publicKey(blocks.public[i].armor);


		if(result != null){
			for(b in result){

				debug_lastreadpublickey = result[b];

				blocks.public[i].object = result[b];
				blocks.public[i].identity = result[b].userIds[0].text;
				blocks.public[i].id = asciiToHex(result[b].getKeyId());
				blocks.public[i].subKeyIds = [];
				
				var isNew = !storage.pending.public.hasOwnProperty(blocks.public[i].id);

				for(k in result[b].subKeys){
					var id = result[b].subKeys[k].getKeyId();

					blocks.public[i].subKeyIds.push(id);

					isNew = isNew &&
					 	!storage.ready.public.hasOwnProperty(id)
				}

				if(isNew){
					storage.pending.public[blocks.public[i].id] = blocks.public[i];
				}

			}
		}else{
			console.log("error while decoding public key");
		}
	}

	for(i in blocks.private){
		var result = openpgp.read_privateKey(blocks.private[i].armor);


		if(result != null){
			for(b in result){

				debug_lastreadprivatekey = result[b];

				blocks.private[i].object = result[b];
				blocks.private[i].identity = result[b].userIds[0].text;
				blocks.private[i].id = asciiToHex(result[b].getKeyId());
				blocks.private[i].subKeyIds = result[b].getSubKeyIds();

				var isNew = !storage.pending.private.hasOwnProperty(blocks.private[i].id);

				for(k in blocks.private[i].subKeyIds){
					isNew = isNew &&
					 	!storage.locked.private.hasOwnProperty(blocks.private[i].subKeyIds[k]) &&
					 	!storage.ready.private.hasOwnProperty(blocks.private[i].subKeyIds[k])
				}

				if(isNew){
					storage.pending.private[blocks.private[i].id] = blocks.private[i];
				}
			}
		}else{
			console.log("error while decoding private key");
		}
	}

	for(i in blocks.message){
		var result = openpgp.read_message(blocks.message[i].armor);


		if(result != null){
			for(b in result){
				debug_lastreadmessage = result[b];
				
				blocks.message[i].object = result[b];

				var ids = [];

				for(s in result[b].sessionKeys){
					ids.push(result[b].sessionKeys[s].keyId.bytes)
				}
				
				blocks.message[i].ids = ids;
				blocks.message[i].sendResponse = sendResponse;

				if(!storage.pending.message.hasOwnProperty(blocks.message[i].nodeId)){
					storage.pending.message[blocks.message[i].id] = blocks.message[i];
				}
			}
		}else{
			console.log("error while decoding message block");
		}
	}

}

function updatePopupBadge(){
	var text = (Object.keys(storage.pending.public).length +
				Object.keys(storage.pending.message).length +
				Object.keys(storage.pending.private).length
				);

	if(text > 0){
		chrome.browserAction.setBadgeText({text:text+""});
	}else{
		chrome.browserAction.setBadgeText({text:""});
	}
}

function setupPopup () {
	var items = {}

	for(i in storage.pending.private){
		items["priv_" + i] = genPopupItemPrivateKey(i);
	}

	for(i in storage.pending.public){
		items[i] = genPopupItemPublicKey(i);
	}

	for(i in storage.pending.message){
		items[i] = genPopupItemMessage(i);
	}

	return items;

}

function genPopupItemPrivateKey (privateKeyId) {
	var item = {
		type : "block",
		badge : "priv",
		note : ""
	}

	identity = identitySplitter(storage.pending.private[privateKeyId].identity);
	item.title = identity.name + " ― clef privée";
	item.text = identity.comment + ", " + identity.mail;
	item.color = "#" + storage.pending.private[privateKeyId].id.substr(colorShift,6);
	
	item.actions = {
		"ignorePrivateKey" : "ignorer",
		"importPrivateKey" : "importer la clef privée"
	}

	return item;
}

function genPopupItemPublicKey (publicKeyId) {
	var item = {
		type : "block",
		badge : "pub",
		note : ""
	}

	identity = identitySplitter(storage.pending.public[publicKeyId].identity);
	item.title = identity.name;
	item.text = identity.comment + ", " + identity.mail;
	item.color = "#" + storage.pending.public[publicKeyId].id.substr(colorShift,6);

	item.actions = {
		"importPublicKey" : "importer",
		"writeMessageWith" : "chiffrer un message",
		"ignorePublicKey" : "ignorer"
	}

	return item;
}

function genPopupItemMessage (messageId) {
	var item = {
		badge : "msg",
		note : ""
	};


	var privateKey = findPrivateKeyForMessage(storage.pending.message[messageId]);
	if(privateKey){
		identity = identitySplitter(privateKey.identity);
		item.type = "block";
		item.title = identity.name;
		item.text = identity.comment + ", " + identity.mail;
		item.color = "#" + privateKey.id.substr(colorShift,6);
	}else{
		item.type = "mini";
		item.title = "Inconnu";
		item.text = "Destinataire inconnu";
		item.color = "#CCC";
	}

	item.actions = {
		"decryptMessage": "déchiffrer",
		"ignoreMessage" : "ignorer"
	}

	return item;
}

function genPopupItemAskForUnlock(privateKeyId){
	var item = {
		type : "block",
		badge : "priv",
		note : "",
		passfield : true,
		colored: true
	}

	identity = identitySplitter(storage.locked.private[privateKeyId].identity);
	item.title = identity.name + " ― dévérouiller";
	item.text = identity.comment + ", " + identity.mail;
	item.color = "#" + storage.locked.private[privateKeyId].id.substr(colorShift,6);
	
	item.actions = {
		"unlockPrivateKey" : "unlock",
	}
	return item;
}

function identitySplitter(identity){
	var result = {};
	if(identity.indexOf('(') != -1){
		result.name = identity.split('(')[0].slice(0,-1);
		result.comment = identity.split('(')[1].split(')')[0];
	}else{
		if(identity.indexOf('<') != -1){
			result.name = identity.split('<')[0].slice(0,-1);
		}else{
			result.name = identity;
		}
		result.comment = '―';
	}

	if(identity.indexOf('<') != -1){
		result.mail = identity.split('<')[1].split('>')[0];
	}else{
		result.mail = '―';
	}
	return result;
}

function asciiToHex(string){
	var output = "";
	for (var i = 0, l = string.length; i < l; i++)
        output += string.charCodeAt(i).toString(16);
    return output;
}

function findPrivateKeyForMessage(message){
	for(j in storage.ready.private){
		for(k in message.ids){
			if(j == message.ids[k]){
				return storage.ready.private[j];
			}
		}
	}
	for(j in storage.locked.private){
		for(k in message.ids){
			if(j == message.ids[k]){
				return storage.locked.private[j];
			}
		}
	}
	return false;
}
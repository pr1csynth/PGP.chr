openpgp.init();

var debug_lastreadmessage = null;
var debug_lastreadpublickey = null;
var debug_lastreadprivatekey = null;

var storage = {
	"pending":{
		"message" : {},
		"public" : {},
		"private" : {}
	},
	"locked":{
		"private" : {}
	},
	"ready":{
		"public" : {},
		"private" : {}
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
			console.log("error while decoding publickey");
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
			console.log("error while decoding privatekey");
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
				Object.keys(storage.pending.message).length + (Object.keys(storage.pending.private).length != 0 ? 1 : 0));

	if(text > 0){
		chrome.browserAction.setBadgeText({text:text+""});
	}else{
		chrome.browserAction.setBadgeText({text:""});
	}
}

function setupPopup () {
	var items = {}

	for(i in storage.pending.message){
		items[i] = {
			type : "block",
			badge : "msg",
			note : ""
		};


		var privateKey = findPrivateKeyForMessage(storage.pending.message[i]);
		if(privateKey){
			identity = identitySplitter(privateKey.identity);
			items[i].title = identity.name;
			items[i].text = identity.comment + ", " + identity.mail;
			items[i].color = "#" + privatekey.id.substr(0,6);
		}else{
			items[i].title = "Inconnu";
			items[i].text = "Destinataire inconnu";
			items[i].color = "#333";
		}

		items[i].actions = {
			"decryptMessage": "déchiffrer",
			"ignoreMessage" : "ignorer"
		}


	}

	for(i in storage.pending.public){
		items[i] = {
			type : "block",
			badge : "pub",
			note : ""
		}

		identity = identitySplitter(storage.pending.public[i].identity);
		items[i].title = identity.name;
		items[i].text = identity.comment + ", " + identity.mail;
		items[i].color = "#" + storage.pending.public[i].id.substr(1,6);
		
		items[i].actions = {
			"importPublicKey" : "importer",
			"writeMessageWith" : "chiffrer un message",
			"ignorePublicKey" : "ignorer"
		}

	}

	for(i in storage.pending.private){
		items["priv_" + i] = {
			type : "block",
			badge : "priv",
			note : ""
		}

		identity = identitySplitter(storage.pending.private[i].identity);
		items["priv_" + i].title = identity.name + " ― clef privée";
		items["priv_" + i].text = identity.comment + ", " + identity.mail;
		items["priv_" + i].color = "#" + storage.pending.private[i].id.substr(1,6);
		
		items["priv_" + i].actions = {
			"ignorePrivateKey" : "ignorer",
			"importPrivateKey" : "importer la clef privée"
		}
	}

	return items;

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
			for(s in storage.ready.private[k].subKeyIds){
				if(s == k){
					return storage.ready.private[k];
				}
			}
		}
	}
	for(j in storage.locked.private){
		for(k in message.ids){
			for(s in storage.locked.private[k].subKeyIds){
				if(s == k){
					return storage.locked.private[k];
				}
			}
		}
	}
	return false;
}
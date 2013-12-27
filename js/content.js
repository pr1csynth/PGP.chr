console.log("PGP.chr loaded.");

var encryptedNodes = {};

chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
                switch(request.object){
                        case "replaceByClearText":
                        	console.log(request);
                        break;
                        default:
                }

                return true;
        }
);

function scanArmoredPGPBlocks(el){
	//el.normalize();

	var blocks = {
		"public":[],
		"private":[],
		"message":[],
		"signedMessage":[],
		"signature":[]
	}

	var types = {
		"public":"PUBLIC KEY BLOCK",
		"private":"PRIVATE KEY BLOCK",
		"message":"MESSAGE",
		"signedMessage":"SIGNED MESSAGE",
		"signature":"SIGNATURE"
	}

	function mergeBlocks(a,b){
		for(i in a){
			a[i] = a[i].concat(b[i]);
		}
		return a;
	}

	function getBlock(text, blockType){
		return "-----BEGIN PGP "+types[blockType]+"-----" + text.split("-----BEGIN PGP "+types[blockType]+"-----")[1].split("-----END PGP "+types[blockType]+"-----")[0]+"-----END PGP "+types[blockType]+"-----";
	}

	for(i in el.childNodes){
		var node = el.childNodes[i];
		if(node.nodeType == Node.TEXT_NODE && node.textContent.trim() != "" && node.textContent.indexOf("PGP") != -1){
			for(t in types){
				var begin 	= node.textContent.indexOf("-----BEGIN PGP "+types[t]+"-----");
				var end 	= node.textContent.indexOf("-----END PGP "+types[t]+"-----");

				if(begin != -1 && end != -1){

					var block = {
						"armor" : getBlock(node.textContent, t),
						"begin" : begin + ("-----BEGIN PGP "+types[t]+"-----").length,
						"end" : end
					}

					if(t == "message"){
						var uuid = UUID();
						encryptedNodes[uuid] = node;
						block.nodeId = uuid;	
					}


					blocks[t].push(block);
				}
			}
		}else{
			blocks = mergeBlocks(blocks, scanArmoredPGPBlocks(node));
		}
	}

	return blocks;
}

var scan = scanArmoredPGPBlocks(document.body);

console.log(scan);

chrome.runtime.sendMessage({"object":"blockScanResult", payload:scan}, function (response) {
	console.log(response);
});

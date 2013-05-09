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
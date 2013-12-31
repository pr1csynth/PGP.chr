chrome.runtime.sendMessage({"object":"setupPopup"}, function (response) {
	setupItems(response);
});

var popup = document.getElementById('popup');
var footer = document.getElementById('footer');
var popupItems = {};


function onMessage(request){

	var actions = {
		"closeItem": removeItem,
		"addItems" : setupItems
	}

	if(request.hasOwnProperty('object')){
		if(actions.hasOwnProperty(request.object)){
			actions[request.object](request.payload);
		}
	}else{
		for(i in request){
			if(actions.hasOwnProperty(request[i].object)){
				actions[request[i].object](request[i].payload);
			}	
		}
	}
}

function setupItems(items){
	for(i in items){
		var article = document.createElement('article');
		var aside = document.createElement('aside');
		var comm = document.createElement('p');
		var note = document.createElement('p');
		var ignore = document.createElement('a');


		aside.textContent = items[i].badge;
		aside.style.backgroundColor = items[i].color;

		if(items[i].color.length == 7 && items[i].color.indexOf('#') != -1){
			if(isBright(items[i].color)){
				aside.style.color = "black";
			}else{
				aside.style.color = "white";
			}

			if(items[i].hasOwnProperty('colored'))
				article.style.backgroundColor = enlight(items[i].color);
		}

		comm.textContent = items[i].text;
		comm.classList.add('comm');

		article.appendChild(aside);
		
		if(items[i].type == "block"){
			var h2 = document.createElement('h2');
			h2.textContent = items[i].title;
			article.appendChild(h2);
		}
		article.appendChild(comm);

		if(items[i].hasOwnProperty('passfield')){
			var input = document.createElement('input');
			input.id = "input_" + i;
			input.setAttribute('type', 'password');
			input.setAttribute('placeholder', items[i].passfield);
			article.appendChild(input);
		}else{		
			note.textContent = items[i].note;
			note.classList.add('note');
		}

		for(a in items[i].actions){
			if(items[i].hasOwnProperty('passfield')){
				var link = document.createElement('button');
				var parent = article;
				link.addEventListener('click', onSubmit);
				link.style.backgroundColor = items[i].color;
				link.style.color = aside.style.color;
			}else{
				var link = document.createElement('a');
				var parent = note;
				link.addEventListener('click', onAction);
			}
			link.textContent = items[i].actions[a];
			link.dataset.action = a;
			link.dataset.id = i;
			parent.appendChild(link);
		}

		article.appendChild(note);
		article.id = i;
		popupItems[i] = article;

		if(items[i].hasOwnProperty('before') && document.getElementById(items[i].before) != null){
			popup.insertBefore(article, document.getElementById(items[i].before));
		}else{
			popup.insertBefore(article, footer);
		}

		if(items[i].type == "mini"){
			article.classList.add('mini');
			aside.style.height = article.style.height = (article.offsetHeight + 5) + "px";
		}
	}
}

function onAction(){
	chrome.runtime.sendMessage({object:this.dataset.action, payload:this.dataset.id}, onMessage);
}

function onSubmit(){
	chrome.runtime.sendMessage({object:this.dataset.action, payload:this.dataset.id, password:document.getElementById('input_'+this.dataset.id).value}, onMessage);
}


function removeItem(id){
	if(popupItems.hasOwnProperty(id)){
		popupItems[id].classList.add('closed');
	}
}

function isBright(hexcolor){
	return (
		parseInt(hexcolor.substr(1,2), 16)*0.96 +
		parseInt(hexcolor.substr(3,2), 16)*1.42 +
		parseInt(hexcolor.substr(5,2), 16)*0.96 
		)/3 > 190
}

function enlight(hexcolor){
	var index = 170;
	var ref = 80;

	var r = parseInt(hexcolor.substr(1,2), 16);
	var g = parseInt(hexcolor.substr(3,2), 16);
	var b = parseInt(hexcolor.substr(5,2), 16);

	var div = Math.min(ref/r, ref/g, ref/b);

	r = between(0,255, div*r);
	g = between(0,255, div*g);
	b = between(0,255, div*b);
	
	r = between(0,255, r + index);
	g = between(0,255, g + index);
	b = between(0,255, b + index);

	return "#" + r.toString(16) + g.toString(16) + b.toString(16);
}

function between (min, max, value) {
	return Math.max(min, Math.min(max, Math.round(value)));
}
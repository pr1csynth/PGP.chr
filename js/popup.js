chrome.runtime.sendMessage({"object":"setupPopup"}, function (response) {
	setupPopup(response);
});

var popup = document.getElementById('popup');
var footer = document.getElementById('footer');
var popupItems = {};


function onMessage(request){
	switch(request.object){
		case "closeItem":
			removeItem(request.payload);
		break;
		default:
			console.log(request);
		break;
	}
}

function setupPopup(items){
	for(i in items){
		var article = document.createElement('article');
		var aside = document.createElement('aside');
		var comm = document.createElement('p');
		var note = document.createElement('p');
		var ignore = document.createElement('a');


		aside.textContent = items[i].badge;
		aside.style.backgroundColor = items[i].color;

		if(items[i].color.length == 7 && items[i].color.indexOf('#') != -1){
			if((
				parseInt(items[i].color.substr(1,2), 16)*0.96 +
				parseInt(items[i].color.substr(3,2), 16)*1.42 +
				parseInt(items[i].color.substr(5,2), 16)*0.96 
				)/3 > 190)
			{
				aside.style.color = "black";
			}
		}

		comm.textContent = items[i].text;
		comm.classList.add('comm');

		note.textContent = items[i].note;
		note.classList.add('note');


		article.appendChild(aside);
		
		if(items[i].type == "block"){
			var h2 = document.createElement('h2');
			h2.textContent = items[i].title;
			article.appendChild(h2);
		}
		article.appendChild(comm);

		for(a in items[i].actions){
			var link = document.createElement('a');
			link.textContent = items[i].actions[a];
			link.dataset.action = a;
			link.dataset.id = i;
			link.addEventListener('click', onAction);
			note.appendChild(link);
		}

		article.appendChild(note);
		article.id = i;
		popupItems[i] = article;
		popup.insertBefore(article, footer);

		if(items[i].type == "notification"){
			article.classList.add('notif');
			aside.style.height = (article.offsetHeight + 5) + "px";
		}
	}
}

function onAction(){
	chrome.runtime.sendMessage({object:this.dataset.action, payload:this.dataset.id}, onMessage);
}


function removeItem(id){
	if(popupItems.hasOwnProperty(id)){
		popupItems[id].classList.add('closed');
	}
}
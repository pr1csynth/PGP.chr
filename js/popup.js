chrome.runtime.sendMessage({"object":"setupPopup"}, function (response) {
	setupPopup(response);
});

var popup = document.getElementById('popup');
var footer = document.getElementById('footer');

function setupPopup(items){
	for(i in items){
		var article = document.createElement('article');
		var aside = document.createElement('aside');
		var comm = document.createElement('p');
		var note = document.createElement('p');
		var ignore = document.createElement('a');


		aside.textContent = items[i].badge;
		aside.style.backgroundColor = items[i].color;

		comm.textContent = items[i].text;
		comm.classList.add('comm');

		note.textContent = "test";
		note.classList.add('note');


		article.appendChild(aside);
		
		if(items[i].type == "block"){
			var h2 = document.createElement('h2');
			h2.textContent = items[i].title;
			article.appendChild(h2);
		}
		article.appendChild(comm);
		article.appendChild(note);

		popup.insertBefore(article, footer);

		if(items[i].type == "notification"){
			article.classList.add('notif');
			aside.style.height = (article.offsetHeight + 2) + "px";
		}
	}
}
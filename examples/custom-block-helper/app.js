var template = require("./template.handlebars");

document.addEventListener("DOMContentLoaded", function() {
	var div = document.createElement('div');
	div.innerHTML = template({
		user: {
		    name: "jack",
		    info: [
		        { status: "leaving" }
		    ]
		}
	});
	document.body.appendChild(div);
});
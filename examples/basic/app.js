var bookListingTemplate = require("./book-listing.handlebars");

document.addEventListener("DOMContentLoaded", function () {
  var div = document.createElement("div");
  div.innerHTML = bookListingTemplate({
    username: "test",
    info: "Your books are due next Tuesday",
    books: [
      { title: "A book", synopsis: "With a description" },
      { title: "Another book", synopsis: "From a very good author" },
      { title: "Book without synopsis" },
    ],
  });
  document.body.appendChild(div);
});

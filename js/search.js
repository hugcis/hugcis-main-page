function search_function() {
    // Declare variables
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById("search_input");
    filter = input.value;

    ul = document.getElementById("note_list");
    li = ul.getElementsByTagName('li');
    if (filter.length == 0) {
        for (let d of li) {
           d.style.display = "";
        }
    }
    else {
        // Loop through all list items, and hide those who don't
        // match the search query
        const results = search(filter, 9).map((d) => d[0].toLowerCase());
        for (i = 0; i < li.length; i++) {
            a = li[i].getElementsByClassName("single-note-title")[0];
            txtValue = a.textContent || a.innerText;
            if (results.indexOf(txtValue.toLowerCase()) > -1) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    }
}

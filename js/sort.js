function search_function() {
    // Declare variables
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById("search_input");
    filter = input.value.toUpperCase();
    ul = document.getElementById("note_list");
    li = ul.getElementsByTagName('li');

    // Loop through all list items, and hide those who don't
    // match the search query
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }
    }
}

function sort_by_rad(a, b) {
    circlea = document.getElementById("/users/hugo/org/roam/" + a.id + ".org");
    circleb = document.getElementById("/users/hugo/org/roam/" + b.id + ".org");

    if (circlea == null || ! circleb == null) {
        return 1;
    }
    else if (! circlea == null || circleb == null) {
        return -1;
    }
    else if (! circlea == null || circleb == null) {
        return 0;
    }
    else {
        return circlea.r.baseVal.value < circleb.r.baseVal.value;
    }
}

function sort_by_name(a, b) {
    return a.children[0].title.replace("Notes on: ", "")
        .localeCompare(b.children[0].title.replace("Notes on: ", ""));
}

function sort_by_date(a, b) {
    db = new Date(b.children[0].children[0]
                  .getElementsByTagName("span")[0].innerHTML.trim());
    da = new Date(a.children[0].children[0]
                  .getElementsByTagName("span")[0].innerHTML.trim());
    return new Date(db) - new Date(da);
}


function sort_list_of_items(type) {
    var ul = document.getElementById("note_list").getElementsByTagName('li');
    ul = Array.prototype.slice.call(ul);
    if (type == "top") {
        ul.sort(sort_by_rad);
    }
    else if (type == "name") {
        ul.sort(sort_by_name);
    }
    else if (type == "latest") {
        ul.sort(sort_by_name);
        ul.sort(sort_by_date);
    }
    var parent = document.getElementById("note_list");
    parent.innerHTML = "";
    for(var i = 0, l = ul.length; i < l; i++) {
        parent.appendChild(ul[i]);
    }
}

var sorter = document.getElementById("sort_type");
function sort_items() {
    sort_list_of_items(sorter.selectedOptions[0].value);
}
sorter.addEventListener("change", sort_items);
sort_items();

var selectOption = sorter.options[sorter.selectedIndex];
var lastSelected = localStorage.getItem('select');

if(lastSelected) {
    sorter.value = lastSelected;
    sort_items();
}

sorter.onchange = function () {
    lastSelected = sorter.options[sorter.selectedIndex].value;
    console.log(lastSelected);
    localStorage.setItem('select', lastSelected);
};

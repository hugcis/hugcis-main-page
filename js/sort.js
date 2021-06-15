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
    let noteGraph = document.getElementsByClassName("note-graph");
    if (noteGraph.length == 0) {
      return 0;
    }
    let ra = 0.;
    let rb = 0.;
    let circlea = noteGraph[0].getElementById("circle_" + a.id);
    if (circlea != null) {
        circlea = circlea.childNodes[0];
        ra = circlea.r.baseVal.value;
    }

    let circleb = noteGraph[0].getElementById("circle_" + b.id);
    if (circleb != null) {
        circleb = circleb.childNodes[0];
        rb = circleb.r.baseVal.value;
    }

    return rb - ra;
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
    sort_items();
};
sort_items();

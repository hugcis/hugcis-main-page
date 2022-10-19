function sort_by_rad(a, b) {
    let noteGraph = document.getElementById("note-graph");
    if (noteGraph == null) {
      return 0;
    }
    let ra = 0.;
    let rb = 0.;
    let circlea = noteGraph.getElementById("circle_" + a.id);
    if (circlea != null) {
        circlea = circlea.childNodes[0];
        ra = circlea.r.baseVal.value;
    }

    let circleb = noteGraph.getElementById("circle_" + b.id);
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
    db = new Date(b.children[0]
                  .getElementsByTagName("span")[0].innerHTML.trim());
    da = new Date(a.children[0]
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

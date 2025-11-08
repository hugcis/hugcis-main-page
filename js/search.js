function search_function() {
    // Declare variables
    var input, filter, ul, li, a, i;
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
        // search() returns array of [title, url] pairs from tinysearch
        const results = search(filter, 9);
        // Use URLs for matching since titles may be truncated in the DOM
        const resultUrls = results.map((d) => d[1].toLowerCase());
        
        for (i = 0; i < li.length; i++) {
            a = li[i].getElementsByTagName('a')[0];
            const itemUrl = a.getAttribute('href').toLowerCase();
            
            // Check if any result URL matches this item's URL
            const isMatch = resultUrls.some(url => {
                // Handle both relative and absolute URL formats
                return itemUrl.includes(url) || url.includes(itemUrl);
            });
            
            if (isMatch) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    }
}

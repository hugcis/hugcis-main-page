(function () {
  "use strict";

  // === Configuration ===
  const GRAPH_DATA_URL = "/js/graph_full.json";
  const NODE_COLORS = [
    "#C98914", "#C55F1A", "#4189AD", "#007500",
    "#968674", "#5E998A", "#363ea9", "#9B2D86",
    "#2DA58A", "#A5572D",
  ];
  const ZOOM_EXTENT = [0.3, 5];
  const ALPHA_DECAY = 0.02;
  const CHARGE_STRENGTH = -250;
  const LINK_STRENGTH = 0.1;
  const COLLISION_STRENGTH = 1.5;
  const COMMUNITY_FORCE_STRENGTH = 0.25;

  // === State ===
  let allNodes = [];
  let allLinks = [];
  let selectedNode = null;

  // === Helpers ===
  function nodeRadius(d) {
    if (!d._radius) {
      d._radius = 11 + 24 * Math.pow(d.centrality, 4 / 5);
    }
    return d._radius;
  }

  function nodeColor(d) {
    if (d.communityLabel < NODE_COLORS.length) return NODE_COLORS[d.communityLabel];
    // Fallback to D3 categorical palette for extra communities
    return d3.schemeTableau10[d.communityLabel % 10];
  }

  // === Main ===
  const svgEl = document.getElementById("graph-explorer");
  if (!svgEl) return;

  const rect = svgEl.getBoundingClientRect();
  const width = rect.width || 1600;
  const height = rect.height || 900;

  const svg = d3.select(svgEl);
  const g = svg.append("g"); // everything goes in this group for zoom

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent(ZOOM_EXTENT)
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  // Start zoomed out to show the full graph
  const initialScale = 0.55;
  const initialTransform = d3.zoomIdentity
    .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
    .scale(initialScale);
  svg.call(zoom);
  svg.call(zoom.transform, initialTransform);

  // Double-click to reset zoom to initial view
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(500).call(zoom.transform, initialTransform);
  });

  // Click on empty space to close sidebar
  svg.on("click", (event) => {
    if (event.target === svgEl) {
      closeSidebar();
    }
  });

  // Update label background filter for dark mode
  function updateLabelFilter() {
    const isDark = document.documentElement.classList.contains("dark");
    d3.select("#label-bg feFlood")
      .attr("flood-color", isDark ? "#3f3f46" : "#f7f7f7");
  }
  updateLabelFilter();

  // Watch for dark mode changes
  const observer = new MutationObserver(() => {
    updateLabelFilter();
    const fillColor = document.documentElement.classList.contains("dark") ? "#e4e4e7" : "#222";
    d3.selectAll("text.label-text").style("fill", fillColor);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Load data and render
  d3.json(GRAPH_DATA_URL).then(function (data) {
    const numColors = Math.max(...data.nodes.map((d) => d.communityLabel)) + 1;
    const angleArr = [...Array(numColors).keys()].map(
      (x) => (2 * Math.PI * x) / numColors
    );
    const centersx = angleArr.map((x) => Math.cos(Math.PI + x));
    const centersy = angleArr.map((x) => Math.sin(Math.PI + x));

    const links = data.links.map((d) => Object.create(d));
    const nodes = data.nodes.map((d) => Object.create(d));
    allNodes = nodes;
    allLinks = links;

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .alphaDecay(ALPHA_DECAY)
      .velocityDecay(0.6)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id).strength(LINK_STRENGTH)
      )
      .force("charge", d3.forceManyBody().strength(CHARGE_STRENGTH))
      .force(
        "collision",
        d3.forceCollide().radius((d) => nodeRadius(d) * 1.2).strength(COLLISION_STRENGTH)
      )
      .force(
        "x",
        d3.forceX().x((d) => width / 2 + (width / 4) * centersx[d.communityLabel])
          .strength(COMMUNITY_FORCE_STRENGTH)
      )
      .force(
        "y",
        d3.forceY().y((d) => height / 2 + (height / 8) * centersy[d.communityLabel])
          .strength(COMMUNITY_FORCE_STRENGTH)
      );

    // Links
    const linkGroup = g
      .append("g")
      .attr("stroke", "#888")
      .attr("stroke-opacity", 0.6);

    const link = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    // Nodes
    const nodeGroup = g.append("g");

    const node = nodeGroup
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", nodeRadius)
      .attr("fill", nodeColor)
      .attr("stroke", "#000")
      .attr("stroke-width", 1.3)
      .attr("cursor", "pointer")
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleNodeClick)
      .call(drag(simulation));

    node.append("title").text((d) => d.label.replace(/"/g, ""));

    // Labels (hidden by default, shown on hover)
    const labelGroup = g.append("g").attr("class", "labels");

    const labelBg = labelGroup
      .selectAll("text.label-bg")
      .data(nodes)
      .join("text")
      .attr("class", "label-bg")
      .style("font-size", "14px")
      .style("display", "none")
      .style("pointer-events", "none")
      .style("alignment-baseline", "middle")
      .attr("filter", "url(#label-bg)")
      .text((d) => "  " + d.label.replace(/"/g, "") + "  ");

    const labelText = labelGroup
      .selectAll("text.label-text")
      .data(nodes)
      .join("text")
      .attr("class", "label-text")
      .style("font-size", "14px")
      .style("fill", () => document.documentElement.classList.contains("dark") ? "#e4e4e7" : "#222")
      .style("display", "none")
      .style("pointer-events", "none")
      .style("alignment-baseline", "middle")
      .text((d) => "  " + d.label.replace(/"/g, "") + "  ");

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      // Keep highlight ring on selected node
      g.selectAll("circle.selected-ring").each(function () {
        if (selectedNode) {
          d3.select(this).attr("cx", selectedNode.x).attr("cy", selectedNode.y);
        }
      });

      labelBg.attr("x", (d) => d.x).attr("y", (d) => d.y - 20);
      labelText.attr("x", (d) => d.x).attr("y", (d) => d.y - 20);
    });

    // === Interaction handlers ===
    function handleMouseOver(event, d) {
      const el = d3.select(this);
      el.attr("fill", "#999").attr("r", nodeRadius(d) * 1.4);

      // Show label for hovered node
      labelBg.filter((n) => n.index === d.index).style("display", "block");
      labelText.filter((n) => n.index === d.index).style("display", "block");

      // Highlight connected edges
      link.attr("stroke-width", (l) =>
        l.source.index === d.index || l.target.index === d.index ? 4 : 1
      );
    }

    function handleMouseOut(event, d) {
      const el = d3.select(this);
      el.attr("fill", nodeColor(d)).attr("r", nodeRadius(d));

      labelBg.filter((n) => n.index === d.index).style("display", "none");
      labelText.filter((n) => n.index === d.index).style("display", "none");

      link.attr("stroke-width", 1);
    }

    function highlightSelected(d) {
      // Remove previous highlight
      g.selectAll("circle.selected-ring").remove();
      if (!d) return;
      // Add a highlight ring behind the selected node
      nodeGroup.insert("circle", ":first-child")
        .attr("class", "selected-ring")
        .attr("cx", d.x)
        .attr("cy", d.y)
        .attr("r", nodeRadius(d) + 6)
        .attr("fill", "none")
        .attr("stroke", nodeColor(d))
        .attr("stroke-width", 3)
        .attr("stroke-opacity", 0.7)
        .attr("stroke-dasharray", "4,3");
    }

    function handleNodeClick(event, d) {
      event.stopPropagation();
      selectedNode = d;
      highlightSelected(d);
      openSidebar(d);
    }

    // Drag
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // === Search ===
    initSearch(nodes);

    // === Expose navigation for sidebar ===
    window._graphNavigateTo = function (nodeId) {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      // Center on node with smooth transition
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(1.5)
        .translate(-target.x, -target.y);
      svg.transition().duration(600).call(zoom.transform, transform);
      selectedNode = target;
      highlightSelected(target);
      openSidebar(target);
    };
  }).catch(function (error) {
    console.error("Failed to load graph data:", error);
    var svgEl = document.getElementById("graph-explorer");
    if (svgEl) {
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "50%");
      text.setAttribute("y", "50%");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#888");
      text.setAttribute("font-size", "16px");
      text.textContent = "Failed to load graph data";
      svgEl.appendChild(text);
    }
  });

  // === Sidebar ===
  function openSidebar(d) {
    const sidebar = document.getElementById("graph-sidebar");
    const content = document.getElementById("sidebar-content");
    if (!sidebar || !content) return;

    // Compute community info
    const communityNodes = allNodes
      .filter((n) => n.communityLabel === d.communityLabel && n.index !== d.index)
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 5);

    // Compute connections
    const incoming = allLinks.filter((l) => l.target.index === d.index);
    const outgoing = allLinks.filter((l) => l.source.index === d.index);
    const incomingRegular = incoming.filter((l) => !l.predicted);
    const outgoingRegular = outgoing.filter((l) => !l.predicted);
    const incomingPredicted = incoming.filter((l) => l.predicted);
    const outgoingPredicted = outgoing.filter((l) => l.predicted);

    // Centrality percentile
    const rank = allNodes.filter((n) => n.centrality >= d.centrality).length;
    const percentile = Math.round((rank / allNodes.length) * 100);

    // Community label from top node
    const topCommunityNode = allNodes
      .filter((n) => n.communityLabel === d.communityLabel)
      .sort((a, b) => b.centrality - a.centrality)[0];
    const communityName = topCommunityNode
      ? topCommunityNode.label.replace(/"/g, "")
      : "Community " + d.communityLabel;

    const colorSwatch = nodeColor(d);

    // Build sidebar DOM safely (no innerHTML)
    content.textContent = ""; // clear previous content

    // Title
    var titleH2 = document.createElement("h2");
    titleH2.className = "text-lg font-semibold mt-0 mb-1 pr-6";
    var titleLink = document.createElement("a");
    titleLink.href = "/notes/" + encodeURIComponent(d.lnk);
    titleLink.className = "text-accent dark:text-accent-light hover:underline";
    titleLink.textContent = d.label.replace(/"/g, "");
    titleH2.appendChild(titleLink);
    content.appendChild(titleH2);

    // Centrality
    var centralityP = document.createElement("p");
    centralityP.className = "text-xs text-zinc-500 dark:text-zinc-400 mb-4";
    centralityP.textContent = "Top " + percentile + "% by PageRank";
    content.appendChild(centralityP);

    // Community section
    var communityDiv = document.createElement("div");
    communityDiv.className = "mb-4";
    var communityH3 = document.createElement("h3");
    communityH3.className = "text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-1 flex items-center gap-2";
    var swatch = document.createElement("span");
    swatch.className = "inline-block w-3 h-3 rounded-full";
    swatch.style.background = colorSwatch;
    communityH3.appendChild(swatch);
    communityH3.appendChild(document.createTextNode("Cluster: " + communityName));
    communityDiv.appendChild(communityH3);

    // Helper: create a styled node list item with bullet and truncation
    function makeNodeListItem(n, btnClass) {
      var li = document.createElement("li");
      li.style.cssText = "display:flex;align-items:baseline;gap:6px;padding:3px 0;border-bottom:1px solid rgba(161,161,170,0.2);";
      var bullet = document.createElement("span");
      bullet.style.cssText = "flex-shrink:0;width:4px;height:4px;border-radius:50%;background:" + nodeColor(n) + ";margin-top:6px;";
      li.appendChild(bullet);
      var btn = document.createElement("button");
      btn.className = btnClass;
      btn.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;display:block;text-align:left;background:transparent;border:0;cursor:pointer;padding:0;font-size:0.8125rem;line-height:1.4;";
      btn.textContent = n.label.replace(/"/g, "");
      btn.title = n.label.replace(/"/g, "");
      btn.addEventListener("click", function () { window._graphNavigateTo(n.id); });
      li.appendChild(btn);
      return li;
    }

    var communityUl = document.createElement("ul");
    communityUl.style.cssText = "padding:0;margin:0;list-style:none;";
    communityNodes.forEach(function (n) {
      communityUl.appendChild(makeNodeListItem(n, "text-accent dark:text-accent-light hover:underline"));
    });
    communityDiv.appendChild(communityUl);
    content.appendChild(communityDiv);

    // Connections section
    var connDiv = document.createElement("div");
    connDiv.className = "mb-2";
    var connH3 = document.createElement("h3");
    connH3.className = "text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-1";
    connH3.textContent = "Connections ";
    var connCount = document.createElement("span");
    connCount.className = "font-normal text-zinc-400";
    connCount.textContent = "(" + incomingRegular.length + " in / " + outgoingRegular.length + " out)";
    connH3.appendChild(connCount);
    connDiv.appendChild(connH3);

    var connUl = document.createElement("ul");
    connUl.style.cssText = "padding:0;margin:0;list-style:none;max-height:280px;overflow-y:auto;";
    var connNodes = incomingRegular.map(function (l) { return l.source; })
      .concat(outgoingRegular.map(function (l) { return l.target; }));
    // Deduplicate
    var seen = {};
    connNodes = connNodes.filter(function (n) {
      if (seen[n.index]) return false;
      seen[n.index] = true;
      return true;
    });
    connNodes.sort(function (a, b) { return b.centrality - a.centrality; });
    connNodes.forEach(function (n) {
      connUl.appendChild(makeNodeListItem(n, "text-accent dark:text-accent-light hover:underline"));
    });
    connDiv.appendChild(connUl);
    content.appendChild(connDiv);

    // Predicted connections section
    var predictedNodes = incomingPredicted.map(function (l) { return l.source; })
      .concat(outgoingPredicted.map(function (l) { return l.target; }));
    var seenPred = {};
    predictedNodes = predictedNodes.filter(function (n) {
      if (seenPred[n.index]) return false;
      seenPred[n.index] = true;
      return true;
    });
    if (predictedNodes.length > 0) {
      var predDiv = document.createElement("div");
      predDiv.className = "mb-2";
      var predH3 = document.createElement("h3");
      predH3.className = "text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-1";
      predH3.textContent = "Predicted ";
      var predCount = document.createElement("span");
      predCount.className = "font-normal text-zinc-400";
      predCount.textContent = "(" + predictedNodes.length + ")";
      predH3.appendChild(predCount);
      predDiv.appendChild(predH3);

      var predUl = document.createElement("ul");
      predUl.style.cssText = "padding:0;margin:0;list-style:none;max-height:160px;overflow-y:auto;";
      predictedNodes.forEach(function (n) {
        var li = makeNodeListItem(n, "text-zinc-500 dark:text-zinc-400 hover:underline");
        li.querySelector("button").style.fontStyle = "italic";
        predUl.appendChild(li);
      });
      predDiv.appendChild(predUl);
      content.appendChild(predDiv);
    }

    sidebar.style.transform = "translateX(0)";
  }

  function closeSidebar() {
    const sidebar = document.getElementById("graph-sidebar");
    if (sidebar) sidebar.style.transform = "translateX(100%)";
    selectedNode = null;
    // Remove highlight ring
    var svgG = document.querySelector("#graph-explorer > g");
    if (svgG) d3.select(svgG).selectAll("circle.selected-ring").remove();
  }

  // Close button
  document.getElementById("sidebar-close")?.addEventListener("click", closeSidebar);

  // === Search ===
  function initSearch(nodes) {
    const input = document.getElementById("graph-search");
    const results = document.getElementById("graph-search-results");
    if (!input || !results) return;

    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        results.classList.add("hidden");
        return;
      }
      const matches = nodes
        .filter((n) => n.label.toLowerCase().includes(query))
        .sort((a, b) => b.centrality - a.centrality)
        .slice(0, 15);

      if (matches.length === 0) {
        results.classList.add("hidden");
        return;
      }

      // Build results with safe DOM methods
      results.textContent = "";
      matches.forEach(function (n) {
        var li = document.createElement("li");
        li.className = "px-3 py-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 list-none";
        li.textContent = n.label.replace(/"/g, "");
        li.addEventListener("click", function () {
          window._graphNavigateTo(n.id);
          input.value = "";
          results.classList.add("hidden");
        });
        results.appendChild(li);
      });
      results.classList.remove("hidden");
    });

    // Hide results on outside click
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.add("hidden");
      }
    });

    // Keyboard navigation
    input.addEventListener("keydown", (e) => {
      const items = results.querySelectorAll("li");
      let activeIdx = -1;
      items.forEach(function (item, i) {
        if (item.classList.contains("bg-accent")) activeIdx = i;
      });

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeIdx >= 0) items[activeIdx].classList.remove("bg-accent", "text-white");
        const nextIdx = activeIdx + 1 < items.length ? activeIdx + 1 : 0;
        items[nextIdx]?.classList.add("bg-accent", "text-white");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeIdx >= 0) items[activeIdx].classList.remove("bg-accent", "text-white");
        const prevIdx = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
        items[prevIdx]?.classList.add("bg-accent", "text-white");
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = results.querySelector("li.bg-accent") || items[0];
        sel?.click();
      } else if (e.key === "Escape") {
        results.classList.add("hidden");
        input.blur();
      }
    });
  }
})();

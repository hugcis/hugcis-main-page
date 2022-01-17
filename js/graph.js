d3.json("/js/graph.json").then(function(data) {
    // Canvas size
    height = 1100;
    width = 1600;
    scale = 1.;
    // Radius function for nodes. Node radius are function of centrality
    radius = d => {
        if (!d.radius) {
            d.radius = 11 + 24 * Math.pow(d.centrality, 4/5);
        }
        return d.radius;
    };
    color = "#ffffff";

    // Number of colors is the number of clusters (given by communityLabel)
    num_colors = Math.max(...data.nodes.map(d => d.communityLabel)) + 1;
    angleArr = [...Array(num_colors).keys()].map(x => 2 * Math.PI * x / num_colors);
    // Cluster centers around an circle
    centersx = angleArr.map(x => Math.cos(Math.PI + x));
    centersy = angleArr.map(x => Math.sin(Math.PI + x));
    // Color palette
    nodeColors = [
        '#C98914',
        '#C55F1A',
        '#4189AD',
        '#007500',
        '#968674',
        '#5E998A',
        "#363ea9",
    ];
    // Color function just maps cluster to color palette
    nodeColor = d => {
        return nodeColors[d.communityLabel];
    };
    // Make the nodes draggable
    drag = simulation => {
        function dragsubject(event) {
            return simulation.find(event.x, event.y);
        }

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;        }

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
            .subject(dragsubject)
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    };
    // Make nodes interactive to hovering
    handleMouseOver = (d, i) => {
        nde = d3.select(d.currentTarget);
        nde.attr("fill", "#999")
            .attr("r", nde.attr("r") * 1.4);

        d3.selectAll("text")
            .filter('#' + CSS.escape(d.currentTarget.id))
            .style("display", "block");

        d3.selectAll("line")
            .attr("stroke-width", 1);

        d3.selectAll("line")
            .filter((l, _) =>
                    l.source.index == i.index ||
                    l.target.index == i.index)
            .attr("stroke-width", 8);
    };
    handleMouseOut = (d, _) => {
        nde = d3.select(d.currentTarget);
        nde.attr("fill", nodeColor)
            .attr("r", nde.attr("r") / 1.4);

        d3.selectAll("text")
            .filter('#' + CSS.escape(d.currentTarget.id))
            .style("display", "none");

    };

    // Graph data
    const links = data.links.map(d => Object.create(d));
    const nodes = data.nodes.map(d => Object.create(d));

    // Force simulation for the graph
    simulation = d3.forceSimulation(nodes)
    .alpha(0.9)
    .velocityDecay(0.6)
        .force("link", d3.forceLink(links).id(d => d.id).strength(.1))
        .force("charge", d3.forceManyBody()
               .strength(-250))
        .force('collision',
               d3.forceCollide().radius(d => radius(d) * 1.2).strength(1.5))
        .force('x', d3.forceX().x(function(d) {
            return width / 2 +  (width / 4) * centersx[d.communityLabel];
        }).strength(0.25))
        .force('y', d3.forceY().y(function(d) {
            return height / 2 +  (height / 8) * centersy[d.communityLabel];
        }).strength(0.25));

    // Create all the graph elements
    const svg = d3.select("svg")
          .attr('max-width', '60%')
          .attr('class', 'note-graph')
          .attr("viewBox", [0, 0, width, height]);

    const link = svg.append("g")
          .attr("stroke", "#888")
          .attr("stroke-opacity", 0.6)
          .selectAll("line")
          .data(links)
          .join("line")
          .attr("stroke-dasharray", d => (d.predicted? "5,5": "0,0"))
          .attr("stroke-width", 1);

    const node = svg.append("g")
          .selectAll("circle")
          .data(nodes)
          .join("a")
          .attr("xlink:href", d => {
              return "./" + d.lnk;
          })
          .attr("id", d => "circle_" + d.lnk)
          .append("circle")
          .attr("id", d => d.id.toLowerCase())
          .attr("r", radius)
          .attr("fill", nodeColor)
          .attr("stroke", "#000")
          .attr("stroke-width", 1.3)
          .on("mouseover", handleMouseOver)
          .on("mouseout", handleMouseOut)
          .call(drag(simulation));

    node.append("title")
        .text(d => d.label.replace(/"/g, ''));

    // Nodes have a label that is visible on hover
    // They have two layers a rectangle "background" and the text on top
    const label = svg.append("g")
          .selectAll("text")
          .data(nodes)
          .join("g");
    const label_background = label.append("text")
          .style("font-size", "25px")
          .text(function (d) { return "  "+ d.label.replace(/"/g, '') + "  "; })
          .attr("dy", -25)
          .attr("id", d => d.id.toLowerCase())
          .attr("class", "node_label")
          .style("display", "none")
          .style("pointer-events", "none")
          .style("alignment-baseline", "middle")
          .attr("filter", "url(#solid)");
    const label_text = label.append("text")
          .style("fill", "#222")
          .style("font-size", "25px")
          .text(function (d) { return "  "+ d.label.replace(/"/g, '') + "  "; })
          .attr("dy", -25)
          .attr("id", d => d.id.toLowerCase())
          .attr("class", "node_label")
          .style("display", "none")
          .style("pointer-events", "none")
          .style("alignment-baseline", "middle");

    // We sort the nodes now because some of the sorting function need the
    // node radius
    sort_items();

    // Run the simulation
    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label_text.attr("x", d => d.x)
            .attr("y", d => d.y);

        label_background.attr("x", d => d.x)
            .attr("y", d => d.y);
    });
});

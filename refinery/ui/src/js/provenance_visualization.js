// author: https://github.com/sluger
// title: in-progress development for the refinery provenance graph visualization

// js module pattern
provenanceVisualizationModule = function () {
    // initializations

    // node-link arrays
    var nodes = [],
        links = [],
        inputNodes = [],
        flatAnalyses = [],
        aNodes = [],
        aLinks = [];

    // dom elements
    var node = null,
        link = null,
        analysis = null,
        aNode = null,
        aLink = null;

    // look up hashes
    var nodeHash = [],
        studyHash = [],
        studyAssayHash = [],
        srcLinkHash = [],
        tarLinkHash = [],
        srcNodeLinkHash = [],
        tarNodeLinkHash = [],
        workflowAnalysisHash = [],
        analysisWorkflowHash = [],
        analysisNodeHash = [];

    // margin conventions
    var margin = {top: 20, right: 10, bottom: 20, left: 10};

    // canvas dimensions
    var width = window.innerWidth - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

    var zoom = null;

    // constants
    var r = 7,
        color = d3.scale.category20();

    // geometric zoom
    var redraw = function () {
        // translation and scaling
        canvas.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
        // fix for rectangle getting translated too, doesn't work after window resize
        rect.attr("transform", "translate(" + (-(d3.event.translate[0] + margin.left) / d3.event.scale) + "," + (-(d3.event.translate[1] + margin.top) / d3.event.scale) + ")" + " scale(" + (+1 / d3.event.scale) + ")");
    };

    // main canvas drawing area
    var canvas = d3.select("#provenance-graph")
        .append("svg:svg")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("viewBox", "0 0 " + (width) + " " + (height))
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("pointer-events", "all")
        .append("svg:g")
        .call(zoom = d3.behavior.zoom().on("zoom", redraw)).on("dblclick.zoom", null)
        .append("svg:g");

    // helper rectangle to support pan & zoom
    var rect = canvas.append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .classed("brect", true);

    // reset css for all nodes
    var clearHighlighting = function () {
        d3.selectAll(".node").each(function () {
            d3.select(this).classed({"highlightedNode": false});
        });
        d3.selectAll(".link").each(function () {
            d3.select(this).classed({"highlightedLink": false});
        });
    };

    // get involved nodes for highlighting the path by current node selection
    var highlightInvolvedPath = function (nodeId, highlighted) {

        // for each predecessor
        srcLinkHash[nodeId].forEach(function (p) {

            // get svg node element
            d3.select("#nodeId-" + p).classed({"highlightedNode": highlighted});

            // get svg link element
            srcNodeLinkHash[p].forEach(function (l) {
                d3.select("#linkId-" + l).classed({"highlightedLink": highlighted});
            });

            highlightInvolvedPath(p, highlighted);
        });
    };

    // shift right amount of the graph for a specific node by an amount of rows (shiftAmount)
    var traverseShift = function (nodeId, shiftAmount) {
        var cur = { o: nodes[nodeId],
            succ: tarLinkHash[nodeId]
        };

        cur.o.row = nodes[nodeId].row + shiftAmount;

        // DFS for each successor
        if (typeof cur.succ !== "undefined") {
            tarLinkHash[nodeId].forEach(function (s) {
                traverseShift(s, shiftAmount);
            });
        }
    };

    // group nodes by layers into a 2d array
    var groupNodesByCol = function (tNodes) {
        var layer = 10,
            cgtNodes = [],
            rtNodes = [];

        tNodes.forEach(function (d) {
            rtNodes.push(copyNode(d));
        });

        cgtNodes.push([]);
        var k = 0;
        rtNodes.reverse().forEach(function (n) {
            if (nodes[n.id].col === layer) {
                cgtNodes[k].push(nodes[n.id]);
            } else if (nodes[n.id].col > layer) {
                cgtNodes[10 - nodes[n.id].col].push(nodes[n.id]);
            } else {
                k++;
                layer--;
                cgtNodes.push([]);
                cgtNodes[k].push(nodes[n.id]);
            }
        });
        return cgtNodes;
    };

    // deep copy node data structure
    var copyNode = function (node) {
        var newNode = {name: "", nodeType: "", fileType: "", uuid: "", study: "", assay: "", fixed: false, row: -1, col: -1, parents: [], id: -1, visited: false, doiFactor: -1};

        newNode.name = node.name;
        newNode.nodeType = node.nodeType;
        newNode.fileType = node.fileType;
        newNode.uuid = node.uuid;
        newNode.study = node.study;
        newNode.assay = node.assay;
        newNode.fixed = node.fixed;
        newNode.row = node.row;
        newNode.col = node.col;
        newNode.id = node.id;
        newNode.visited = node.visited;
        node.parents.forEach(function (p, i) {
            newNode.parents[i] = p;
        });
        newNode.analysis = node.analysis;
        newNode.doiFactor = node.doiFactor;

        return newNode;
    };

    // TODO: rewrite row layering, keywords: vertex ordering, and y-coordinate assignment (see hierarchical.pdf)
    // layout node columns
    var placeNodes = function (lgNodes) {
        var layer = 10,
            row = 0,
            curRow = 0;

        // from right to left
        lgNodes.forEach(function (lg) {

            lg.forEach(function (n) {
                var cur = { id: nodeHash[n.uuid],
                    o: nodes[nodeHash[n.uuid]],
                    pred: srcLinkHash[nodeHash[n.uuid]],
                    succ: tarLinkHash[nodeHash[n.uuid]],
                    neighbors: []
                };

                // for each successor get pred (= neighbors)
                var neighbors = [];
                if (typeof cur.succ !== "undefined") {
                    cur.succ.forEach(function (s) {
                        nodes[s].parents.forEach(function (p) {
                            if (nodes[nodeHash[p]].id !== cur.id) {
                                neighbors.push(nodeHash[p]);
                            }
                        });
                    });
                    cur.neighbors = neighbors;
                }

                // SUCC UNDEFINED
                if (typeof cur.succ === "undefined") {
                    // PRED DEFINED
                    if (typeof cur.pred !== "undefined") {
                        // 1 PRED
                        if (cur.pred.length === 1) {
                            curRow = row;
                            row++;
                        }
                        // n PRED
                        else {
                        }
                    }
                    // PRED UNDEFINED
                    else {
                        curRow = row;
                    }
                }
                // SUCC DEFINED
                else {
                    var minRow;
                    var maxRow;
                    var visited;

                    // PRED DEFINED
                    if (typeof cur.pred !== "undefined") {

                        // 1 PRED 1 SUCC
                        if (cur.pred.length === 1 && cur.succ.length === 1) {
                            // 0 NEIGHBORS
                            if (cur.neighbors.length === 0) {
                                curRow = nodes[cur.succ[0]].row;
                            } else {
                                // n NEIGHBORS
                                // check neighbors visited
                                visited = 0;
                                cur.neighbors.forEach(function (nb) {
                                    if (nodes[nb].visited) {
                                        visited++;
                                    }
                                });
                                curRow = nodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
                            }
                        }
                        // 1 PRED n SUCC
                        else if (cur.pred.length === 1 && cur.succ.length > 1) {
                            minRow = nodes[cur.succ[0]].row;
                            maxRow = -1;

                            // get min and max row for SPLIT BRANCH
                            cur.succ.forEach(function (s) {
                                if (nodes[s].row < minRow) {
                                    minRow = nodes[s].row;
                                }
                                if (nodes[s].row > maxRow) {
                                    maxRow = nodes[s].row;
                                }
                            });
                            if ((minRow + (maxRow - minRow) / 2) === curRow) {
                                curRow += curRow;
                            } else {
                                curRow = minRow + (maxRow - minRow) / 2;
                            }
                        }
                        // n PRED 1 SUCC
                        else if (cur.pred.length > 1 && cur.succ.length === 1) {
                            curRow = nodes[cur.succ[0]].row + cur.pred.length / 2;

                            // traverse graph and shift succs by row_shift
                            traverseShift(cur.succ[0], cur.pred.length / 2);
                        }
                        // n PRED n SUCC
                        else {
                            minRow = nodes[cur.succ[0]].row;
                            maxRow = -1;

                            // get min and max row for SPLIT BRANCH
                            cur.succ.forEach(function (s) {
                                if (nodes[s].row < minRow) {
                                    minRow = nodes[s].row;
                                }
                                if (nodes[s].row > maxRow) {
                                    maxRow = nodes[s].row;
                                }
                            });

                            // 0 NEIGHBORS
                            if (cur.neighbors.length === 0) {
                                curRow = minRow + (maxRow - minRow) / 2;
                            } else {
                                // n NEIGHBORS
                                // check neighbors visited
                                visited = 0;
                                cur.neighbors.forEach(function (nb) {
                                    if (nodes[nb].visited) {
                                        visited++;
                                    }
                                });
                                curRow = nodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
                            }
                        }
                    }
                    // PRED UNDEFINED
                    else {
                        // 1 SUCC
                        if (cur.succ.length === 1) {
                            curRow = nodes[cur.succ[0]].row;
                        }
                        // n SUCC
                        else {
                            minRow = nodes[cur.succ[0]].row;
                            maxRow = -1;

                            // get min and max row for SPLIT BRANCH
                            cur.succ.forEach(function (s) {
                                if (nodes[s].row < minRow) {
                                    minRow = nodes[s].row;
                                }
                                if (nodes[s].row > maxRow) {
                                    maxRow = nodes[s].row;
                                }
                            });

                            curRow = minRow + (maxRow - minRow) / 2;
                        }
                    }
                }
                nodes[n.id].row = curRow;
                cur.o.visited = true;
            });
            layer--;
            row = 0;
        });
    };

    // TODO: handle graph width
    // layering
    var coffmanGrahamLayering = function (tNodes) {
        var layer = 10,
            succ = [],
            rtNodes = [];

        tNodes.forEach(function (d) {
            rtNodes.push(copyNode(d));
        });

        rtNodes.reverse().forEach(function (n) {
            // get outgoing neighbor
            succ = tarLinkHash[nodeHash[n.uuid]];

            if (typeof succ === "undefined") {
                nodes[n.id].col = layer;
                n.col = layer;
            } else {
                var maxSuccLayer = layer;
                succ.forEach(function (s) {
                    if (nodes[s].col < maxSuccLayer) {
                        maxSuccLayer = nodes[s].col;
                    }
                });
                nodes[n.id].col = maxSuccLayer - 1;
                n.col = maxSuccLayer - 1;
            }
        });
    };

    // TODO: lexicographic sort for each layer
    // topology sort (inspired by http://en.wikipedia.org/wiki/Topological_sorting)
    var topSort = function (inputs) {
        var s = [], // input set
            l = [], // result set for sorted elements
            cnodes = [],// deep copy nodes, because we have to delete links from the graph
            n = null,
            succ = [];

        // deep copy arrays by value
        inputs.forEach(function (inNode) {
            s.push(copyNode(inNode));
        });
        nodes.forEach(function (selNode) {
            cnodes.push(copyNode(selNode));
        });

        // to avoid definition of function in while loop below (added by NG)
        // for each successor
        var handleUndefined = function (m) {
            // delete parent with p.uuid == n.uuid
            var index = -1;
            // for each parent (predecessor)
            cnodes[m].parents.forEach(function (p, i) {
                if (p == n.uuid) {
                    index = i;
                }
            });
            // if parent of successor equals n, delete edge
            if (index > -1) {
                cnodes[m].parents.splice(index, 1);
            }
            // if there are no edges left,
            if (cnodes[m].parents.length === 0) {
                s.push(cnodes[m]);
            }
            // else, current successor has other parents to be processed first
        };

        // while the input set is not empty
        while (s.length > 0) {
            n = s.shift(); // remove first item n
            l.push(n); // and push it into result set

            // get successor set for n
            succ = tarLinkHash[nodeHash[n.uuid]];

            if (typeof succ !== "undefined") {
                succ.forEach(handleUndefined);
            }
        }

        return l;
    };

    // extract nodes
    var extractNodes = function (datasetJsonObj) {
        d3.values(datasetJsonObj.value).forEach(function (x, i) {

            // assign class string for node types
            var nodeType = assignCSSNodeType(x.type);

            // extract node properties from api
            extractNodeProperties(x, nodeType, i);

            // build node hashes
            createNodeHashes(x, i);

            // set input nodes
            if (x.type == "Source Name") {
                inputNodes.push(nodes[i]);
            }
        });
    };

    // extract links
    var extractLinks = function () {
        var linkId = 0;
        nodes.forEach(function (x, i) { // x may be parent of y
            if (typeof x.uuid !== "undefined" && typeof x.parents !== "undefined") {
                var srcNodeIds = [],
                    srcLinkIds = [];

                // for each parent entry
                x.parents.forEach(function (z, k) {

                    // extractLinkProperties
                    extractLinkProperties(x, linkId, k);

                    // build link hashes
                    createLinkHashes(z, linkId, i, srcNodeIds, srcLinkIds);
                    linkId++;

                });
                srcNodeLinkHash[i] = srcLinkIds;
                srcLinkHash[i] = srcNodeIds;
            }
        });
    };

    // extractLinkProperties
    var extractLinkProperties = function (nodeElem, linkId, parentIndex) {
        links.push({
            source: nodeHash[nodeElem.parents[parentIndex]],
            target: nodeHash[nodeElem.uuid],
            id: linkId
        });
    };

    // create one node representing the whole analysis when aggregated
    var createAnalysisNodes = function () {
        aNodes.push({"uuid": "dataset", "row": -1, "col": -1, "id": 0, "start": -1, "end": -1, "created": -1, "doiFactor": -1, "nodes": [], "inputNodes": [], "outputNodes": []});

        analyses.objects.forEach(function (a, i) {
            aNodes.push({"uuid": a.uuid, "row": -1, "col": -1, "id": i + 1, "start": a.time_start, "end": a.time_end, "created": a.creation_date, "doiFactor": -1, "nodes": [], "inputNodes": [], "outputNodes": []});
        });

// TODO: extract in- and output node list

    };

    // createAnalysisLinks
    var createAnalysisLinks = function () {
// TODO: create links between nodes and aggregated nodes
    };

    // build link hashes
    var createLinkHashes = function (parentNodeElem, linkId, nodeId, srcNodeIds, srcLinkIds) {
        srcNodeIds.push(nodeHash[parentNodeElem]);
        srcLinkIds.push(linkId);

        if (tarLinkHash.hasOwnProperty(nodeHash[parentNodeElem])) {
            tarLinkHash[nodeHash[parentNodeElem]] = tarLinkHash[nodeHash[parentNodeElem]].concat([nodeId]);
            tarNodeLinkHash[nodeHash[parentNodeElem]] = tarNodeLinkHash[nodeHash[parentNodeElem]].concat([linkId]);
        } else {
            tarLinkHash[nodeHash[parentNodeElem]] = [nodeId];
            tarNodeLinkHash[nodeHash[parentNodeElem]] = [linkId];
        }
    };

    // build node hashes
    var createNodeHashes = function (nodeObj, nodeIndex) {
        nodeHash[nodeObj.uuid] = nodeIndex;
        studyHash[nodeIndex] = nodes[nodeIndex].study;
        studyAssayHash[nodes[nodeIndex].study] = nodes[nodeIndex].assay;
    };

    // extract node api properties
    var extractNodeProperties = function (nodeObj, nodeType, nodeIndex) {
        nodes.push({
            name: nodeObj.name,
            fileType: nodeObj.type,
            nodeType: nodeType,
            uuid: nodeObj.uuid,
            study: (nodeObj.study !== null) ? nodeObj.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
            assay: (nodeObj.assay !== null) ? nodeObj.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
            parents: nodeObj.parents.map(function (y) {
                return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
            }),
            fixed: true,
            row: -1,
            col: -1,
            id: nodeIndex,
            visited: false,
            analysis: (nodeObj.analysis_uuid !== null) ? nodeObj.analysis_uuid : "dataset",
            doiFactor: -1
        });
    };

    // assign CSS class for node types
    var assignCSSNodeType = function (nodeType) {
        var nodeTypeClass = "";

        switch (nodeType) {
            case "Source Name":
            case "Sample Name":
            case "Assay Name":
                nodeTypeClass = "special";
                break;
            case "Data Transformation Name":
                nodeTypeClass = "dt";
                break;
            default:
                nodeTypeClass = "processed";
                break;
        }

        return nodeTypeClass;
    };

    // for each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it
    var createAnalysisNodeMapping = function () {
        nodes.forEach(function (n, i) {
            if (analysisNodeHash.hasOwnProperty(n.analysis)) {
                analysisNodeHash[n.analysis] = analysisNodeHash[n.analysis].concat([i]);
            } else {
                analysisNodeHash[n.analysis] = [i];
            }
        });

        aNodes.forEach(function (an) {
            an.nodes = analysisNodeHash[an.uuid].map(function (d) {
                return nodes[d]; // flatten nodes objects
            });

            an.inputNodes = an.nodes.filter(function (n) {
                return srcLinkHash[n.id].some(function (p) {
                    return nodes[p].analysis != an.uuid;
                }) || srcLinkHash[n.id].length === 0;
            });
            an.outputNodes = an.nodes.filter(function (n) {
                return typeof tarLinkHash[n.id] === "undefined" || tarLinkHash[n.id].some(function (s) {
                    return nodes[s].analysis != an.uuid;
                });
            });
        });
    };

    // extract workflows from analyses
    // a workflow might be executed by multiple analyses
    var createWorkflowAnalysisMapping = function () {
        analyses.objects.forEach(function (a) {
            // workflow -> analysis
            if (workflowAnalysisHash.hasOwnProperty(a.workflow__uuid)) {
                workflowAnalysisHash[a.workflow__uuid] = workflowAnalysisHash[a.workflow__uuid].concat([a.uuid]);
            } else {
                workflowAnalysisHash[a.workflow__uuid] = [a.uuid];
            }

            // analysis -> workflow
            analysisWorkflowHash[a.uuid] = a.workflow__uuid;
        });

        flatAnalyses = [].concat.apply(["dataset"], d3.values(workflowAnalysisHash));
    };

    // set coordinates for nodes
    var assignGridCoordinates = function () {
        nodes.forEach(function (d) {
            d.x = d.col * 50 + 100;
            d.y = d.row * 50 + 100;
        });
    };

    // creates analysis group dom elements which then contain the nodes and links of an analysis
    var createAnalysisLayers = function () {

        // add analyses dom groups
        analysis = canvas.selectAll(".analysis")
            .data(flatAnalyses)
            .enter().append("g")
            .classed("analysis", true)
            .attr("id", function (d) {
                return d;
            });
    };

    // drag start listener support for nodes
    var dragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    // drag listener
    var dragging = function (d) {
        // drag selected node
        d3.select(this).attr("transform", function (n) {
            switch (n.nodeType) {
                case "raw":
                case "processed":
                    return "translate(" + d3.event.x + "," + d3.event.y + ")";
                case "special":
                    return "translate(" + (d3.event.x - r) + "," + (d3.event.y - r) + ")";
                case "dt":
                    return "translate(" + (d3.event.x - r * 0.75) + "," + (d3.event.y - r * 0.75) + ")";
            }
        });

        // drag adjacent links

        // get input links
        // update coordinates for x2 and y2
// TODO: DEBUG: CONSOLE ERROR MSG
        srcNodeLinkHash[d.id].forEach(function (l) {
            d3.select("#linkId-" + l).attr("x2", d3.event.x);
            d3.select("#linkId-" + l).attr("y2", d3.event.y);
        });

        // get output links
        // update coordinates for x1 and y1
        tarNodeLinkHash[d.id].forEach(function (l) {
            d3.select("#linkId-" + l).attr("x1", d3.event.x);
            d3.select("#linkId-" + l).attr("y1", d3.event.y);
        });
    };

    // drag end listener
    var dragEnd = function () {
    };

    var applyDragBehavior = function () {
        // drag and drop node enabled
        var drag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        // invoke dragging behavior on nodes
        d3.selectAll(".node").call(drag);
    };

    // drag start listener support for nodes
    var analysisDragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    // drag listener
    var analysisDragging = function (d) {
        // drag selected node
        d3.select(this).attr("transform", function (n) {
            return "translate(" + d3.event.x + "," + d3.event.y + ")";
        });
// TODO: adapt links when dragging nodes
        /*
         // drag adjacent links

         // get input links
         // update coordinates for x2 and y2
         srcNodeLinkHash[d.id].forEach(function (l) {
         d3.select("#linkId-" + l).attr("x2", d3.event.x);
         d3.select("#linkId-" + l).attr("y2", d3.event.y);
         });

         // get output links
         // update coordinates for x1 and y1
         tarNodeLinkHash[d.id].forEach(function (l) {
         d3.select("#linkId-" + l).attr("x1", d3.event.x);
         d3.select("#linkId-" + l).attr("y1", d3.event.y);
         });*/
    };

    // drag end listener
    var analysisDragEnd = function () {
    };

    var applyAnalysisDragBehavior = function () {
        // drag and drop node enabled
        var analysisDrag = d3.behavior.drag()
            .on("dragstart", analysisDragStart)
            .on("drag", analysisDragging)
            .on("dragend", analysisDragEnd);

        // invoke dragging behavior on nodes
        d3.selectAll(".aNode").call(analysisDrag);
    };

    // dye graph by analyses and its corresponding workflows
    var dyeWorkflows = function () {
        node.each(function () {
            d3.select(this).style("stroke", function (d) {
                return color(analysisWorkflowHash[d.analysis]);
            });
        });

    };

    // dye graph by analyses
    var dyeAnalyses = function () {
        node.each(function () {
            d3.select(this).style("fill", function (d) {
                return color(d.analysis);
            });
        });

    };

    // draw links
    var drawLinks = function () {
        analysis.each(function (a) {
            d3.select(this).selectAll(".link")
                .data(links.filter(function (l) {
                    return nodes[l.target].analysis == a /*&& nodes[l.source].analysis == a*/;
                }))
                .enter().append("line")
                .attr("x1", function (l) {
                    return nodes[l.source].x;
                })
                .attr("y1", function (l) {
                    return nodes[l.source].y;
                })
                .attr("x2", function (l) {
                    return nodes[l.target].x;
                })
                .attr("y2", function (l) {
                    return nodes[l.target].y;
                })
                .classed({
                    "link": true
                })
                .style("opacity", 0.0)
                .attr("id", function (l) {
                    return "linkId-" + l.id;
                });
        });

        // set link dom element
        link = d3.selectAll(".link");
    };

    // draw analysis nodes
    var drawAnalysisNodes = function () {
        analysis.each(function (a) {
            var curAnalysis = d3.select(this);
            d3.select(this).selectAll(".aNode")
                .data(aNodes.filter(function (an) {
                    return an.uuid == a;
                }))
                .enter().append("g").each(function (an) {
// TODO: DEBUG: temp coordinate assignment
                    // get min and max column/row of nodes to center new analysis process node
                    var min = [d3.min(nodes.filter(function (n) {
                            return n.analysis == an.uuid;
                        }), function (d) {
                            return d.x;
                        }), d3.min(nodes.filter(function (n) {
                            return n.analysis == an.uuid;
                        }), function (d) {
                            return d.y;
                        })],
                        max = [d3.max(nodes.filter(function (n) {
                            return n.analysis == an.uuid;
                        }), function (d) {
                            return d.x;
                        }), d3.max(nodes.filter(function (n) {
                            return n.analysis == an.uuid;
                        }), function (d) {
                            return d.y;
                        })];
                    var delta = {x: min[0] + (max[0] - min[0]) / 2, y: min[1] + (max[1] - min[1]) / 2};

                    d3.select(this).classed({"aNode": true, "superANode": true})
                        .attr("transform", "translate(" + delta.x + "," + delta.y + ")")
                        .append("circle")
                        .attr("r", r * 2)
                        .style("fill", function () {
                            return color(an.uuid);
                        })
                        .style("stroke", function () {
                            return color(analysisWorkflowHash[an.uuid]);
                        })
                        .style("stroke-width", 3);
                });
        });

        // set node dom element
        aNode = d3.selectAll(".aNode");

        // create d3-tip tooltips
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return d.id === 0 ? "<span style='color:#fa9b30'>Original Dataset</span><br><strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" :
                    "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                        "<strong>Start:</strong> <span style='color:#fa9b30'>" + d.start + "</span><br>" +
                        "<strong>End:</strong> <span style='color:#fa9b30'>" + d.end + "</span>";
            });

        // invoke tooltip on dom element
        aNode.call(tip);
        aNode.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    // draw nodes
    var drawNodes = function () {
        analysis.each(function (a) {
            d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return n.analysis == a;
                }))
                .enter().append("g").each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", r);
                    } else {
                        if (d.nodeType === "special") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - r) + "," + (d.y - r) + ")")
                                .append("rect")
                                .attr("width", r * 2)
                                .attr("height", r * 2);
                        }
                        if (d.nodeType === "dt") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - r * 0.75) + "," + (d.y - r * 0.75) + ")")
                                .append("rect")
                                .attr("width", r * 1.5)
                                .attr("height", r * 1.5)
                                .attr("transform", function () {
                                    return "rotate(45 " + (r * 0.75) + "," + (r * 0.75) + ")";
                                });
                        }
                    }
                }).classed({
                    "node": true,
                    "rawNode": (function (d) {
                        return d.nodeType == "raw";
                    }),
                    "specialNode": (function (d) {
                        return d.nodeType == "special";
                    }),
                    "dtNode": (function (d) {
                        return d.nodeType == "dt";
                    }),
                    "processedNode": (function (d) {
                        return d.nodeType == "processed";
                    })
                }).attr("id", function (d) {
                    return "nodeId-" + d.id;
                });
        });

        // set node dom element
        node = d3.selectAll(".node");

        // create d3-tip tooltips
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                    "<strong>Name:</strong> <span style='color:#fa9b30'>" + d.name + "</span><br>" +
                    "<strong>Type:</strong> <span style='color:#fa9b30'>" + d.fileType + "</span>";
            });

        // invoke tooltip on dom element
        node.call(tip);
        node.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };


// TODO: PROTOTYPE: DEBUG: IN PROGRESS: - selecting an analysis, collapse it into a single node
    // collapse analysis
    var handleCollapseAnalysis = function () {
        var offset = [0, 0],
            aNodeIndex = 0;

        d3.selectAll(".analysis").on("dblclick", function (a) {
            var curAnalysis = d3.select(this);

            d3.select(this).selectAll(".node").style("display", "none");

            // get min and max column/row of nodes to center new analysis process node
            var min = [d3.min(nodes.filter(function (n) {
                    return n.analysis == a;
                }), function (d) {
                    return d.x;
                }), d3.min(nodes.filter(function (n) {
                    return n.analysis == a;
                }), function (d) {
                    return d.y;
                })],
                max = [d3.max(nodes.filter(function (n) {
                    return n.analysis == a;
                }), function (d) {
                    return d.x;
                }), d3.max(nodes.filter(function (n) {
                    return n.analysis == a;
                }), function (d) {
                    return d.y;
                })];
            var delta = {x: min[0] + (max[0] - min[0]) / 2, y: min[1] + (max[1] - min[1]) / 2};

// TODO: save aggregated nodes in own node-set with datastructure and draw them like links and nodes but hidden unless collapsed

            curAnalysis.append("g")
                .classed({"aNode": true, "superANode": true})
                .attr("transform", "translate(" + delta.x + "," + delta.y + ")")
                .append("circle")
                .attr("r", r * 2)
                .style("fill", function () {
                    return curAnalysis.select(".node").style("fill");
                })
                .style("stroke", function () {
                    return curAnalysis.select(".node").style("stroke");
                })
                .style("stroke-width", 3);

            // hide all links except the ones connecting to different analyses
            d3.select(this).selectAll(".link").each(function (l) {
                if (nodes[l.source].analysis == a && nodes[l.target].analysis == a) {
                    d3.select(this).style("display", "none");

                    // if l.source node has no link source
                    if (srcLinkHash[nodes[l.source].id].length === 0) {
                        offset = [d3.select(this).attr("x1"), d3.select(this).attr("y1")];
                        curAnalysis.append("g")
                            .classed({"aNode": true, "inANode": true})
                            .attr("transform", "translate(" + offset[0] + "," + offset[1] + ")")
                            .append("circle")
                            .attr("r", r * 2)
                            .style("fill", function () {
                                return curAnalysis.select(".node").style("fill");
                            })
                            .style("stroke", function () {
                                return curAnalysis.select(".node").style("stroke");
                            })
                            .style("stroke-width", 3);
                    }

                    // if l.target node has no link target
                    if (!tarLinkHash[nodes[l.target].id]) {
                        offset = [d3.select(this).attr("x2"), d3.select(this).attr("y2")];
                        curAnalysis.append("g")
                            .classed({"aNode": true, "outANode": true})
                            .attr("transform", "translate(" + offset[0] + "," + offset[1] + ")")
                            .append("circle")
                            .attr("r", r * 2)
                            .style("fill", function () {
                                return curAnalysis.select(".node").style("fill");
                            })
                            .style("stroke", function () {
                                return curAnalysis.select(".node").style("stroke");
                            })
                            .style("stroke-width", 3);
                    } else {
                        // if l.target node analysis is other analysis
                        if (tarLinkHash[nodes[l.target].id].some(function (ai) {
                            return nodes[ai].analysis != a;
                        })) {
                            offset = [d3.select(this).attr("x2"), d3.select(this).attr("y2")];
                            curAnalysis.append("g")
                                .classed({"aNode": true, "outANode": true})
                                .attr("transform", "translate(" + offset[0] + "," + offset[1] + ")")
                                .append("circle")
                                .attr("r", r * 2)
                                .style("fill", function () {
                                    return curAnalysis.select(".node").style("fill");
                                })
                                .style("stroke", function () {
                                    return curAnalysis.select(".node").style("stroke");
                                })
                                .style("stroke-width", 3);
                        }
                    }
                }

                // for the connecting link, create a new analysis node
                else {
                    offset = [d3.select(this).attr("x2"), d3.select(this).attr("y2")];
                    curAnalysis.append("g")
                        .classed({"aNode": true, "inANode": true})
                        .attr("transform", "translate(" + offset[0] + "," + offset[1] + ")")
                        .append("circle")
                        .attr("r", r * 2)
                        .style("fill", function () {
                            return curAnalysis.select(".node").style("fill");
                        })
                        .style("stroke", function () {
                            return curAnalysis.select(".node").style("stroke");
                        })
                        .style("stroke-width", 3);
                }
            });

// TODO: create links between in- out- and super aNode
        });
    };

    // path highlighting
    var handlePathHighlighting = function () {
        d3.selectAll(".node").on("click", function (x) {
            var highlighted = true;

            // suppress after dragend
            if (d3.event.defaultPrevented) return;

            // clear any highlighting
            clearHighlighting();

            // highlight selected node and links
            d3.select(this).classed({"highlightedNode": true});
            srcNodeLinkHash[x.id].forEach(function (l) {
                d3.select("#linkId-" + l).classed({"highlightedLink": highlighted});
            });

            // highlight path
            highlightInvolvedPath(x.id, highlighted);
        });
    };

    // fit visualization onto free windows space
    var fitGraphToWindow = function (transitionTime) {
        var min = [d3.min(nodes, function (d) {
                return d.x - margin.left;
            }), d3.min(nodes, function (d) {
                return d.y - margin.top;
            })],
            max = [d3.max(nodes, function (d) {
                return d.x + margin.right;
            }), d3.max(nodes, function (d) {
                return d.y + margin.bottom;
            })],
            delta = [max[0] - min[0], max[1] - min[1]],
            factor = [(width / delta[0]), (height / delta[1])],
            newScale = d3.min(factor),
            newPos = [((width - delta[0] * newScale) / 2),
                ((height - delta[1] * newScale) / 2)];

        newPos[0] -= min[0] * newScale;
        newPos[1] -= min[1] * newScale;

        if (transitionTime !== 0) {
            canvas
                .transition()
                .duration(1000)
                .attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        } else {
            canvas.attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        }

        zoom.translate(newPos);
        zoom.scale(newScale);

        // background rectangle fix
        rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," + (-newPos[1] / newScale) + ")" + " scale(" + (+1 / newScale) + ")");
    };

    // wrapper function to invoke scale and transformation onto the visualization
    var handleFitGraphToWindow = function () {
        fitGraphToWindow(1000);
    };

    // click and dblclick separation on background rectangle
    var handleBRectClick = function () {
        var clickinProgress = false, // click in progress
            timer = 0,
            bRectAction = clearHighlighting;	// default action

        d3.select(".brect").on("click", function () {
            // suppress after dragend
            if (d3.event.defaultPrevented) return;

            // if dblclick, break
            if (clickinProgress) {
                return;
            }

            clickinProgress = true;
            // single click event is called after timeout unless a dblick action is performed
            timer = setTimeout(function () {
                bRectAction();	// called always

                bRectAction = clearHighlighting; // set back click action to single
                clickinProgress = false;
            }, 200); // timeout value
        });

        // if dblclick, the single click action is overwritten
        d3.select(".brect").on("dblclick", function () {
            bRectAction = handleFitGraphToWindow;
        });
    };

    // event listeners
    var handleEvents = function () {
        // path highlighting
        handlePathHighlighting();

        // handle click separation
        handleBRectClick();

        // handle analysis aggregation
        handleCollapseAnalysis();
    };

    // main d3 visualization function
    var drawGraph = function () {

        // short delay
        setTimeout(function () {

            // set coordinates for nodes
            assignGridCoordinates();

            // create analysis group layers
            createAnalysisLayers();

            // draw links
            drawLinks();

            // draw nodes
            drawNodes();

            // draw analysis nodes
            drawAnalysisNodes();

            // set initial graph position
            fitGraphToWindow(0);

            // colorize graph
            dyeWorkflows();
            dyeAnalyses();

            // add dragging behavior to nodes
            applyDragBehavior();

            // add dragging behavior to analysis nodes
            applyAnalysisDragBehavior();

            // event listeners
            handleEvents();


            // fade in
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);
    };

    // layout graph
    var layout = function () {
        // topological order
        var topNodes = topSort(inputNodes);

        // coffman-graham layering
        coffmanGrahamLayering(topNodes);

        // group nodes by layer
        var layeredTopNodes = groupNodesByCol(topNodes);

        // place vertices
        placeNodes(layeredTopNodes);
    };

    // refinery injection for the provenance visualization
    var runProvenanceVisualizationPrivate = function (studyUuid) {
        var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json&limit=0";

        // parse json
        d3.json(url, function (error, data) {

            // extract raw objects
            var obj = d3.entries(data)[1];

            // create node collection
            extractNodes(obj);

            // create link collection
            extractLinks();

            // create analyses and workflow hashes
            createWorkflowAnalysisMapping();

            // extract analysis nodes
            createAnalysisNodes();

            // extract analysis links
            createAnalysisLinks();

            // create analysis node mapping
            createAnalysisNodeMapping();

            // calculate layout
            layout();

            // call d3 visualization
            drawGraph();
        });
    };

    // publish public function
    return{
        runProvenanceVisualization: function (studyUuid) {
            runProvenanceVisualizationPrivate(studyUuid);
        }
    };
}();
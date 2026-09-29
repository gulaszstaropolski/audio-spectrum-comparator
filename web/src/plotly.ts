import Plotly from "plotly.js/lib/core";
import heatmap from "plotly.js/lib/heatmap";
import scatter from "plotly.js/lib/scatter";
import bar from "plotly.js/lib/bar";

Plotly.register([heatmap, scatter, bar]);

export default Plotly;

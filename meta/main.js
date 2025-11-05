// Import d3 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load CSV data, converting types as needed, e.g. numbers and dates
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

// Process commits from data by grouping lines by commit hash 
// For example: { commit: 'abc123', author: 'John Doe', ... }
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      // Each 'lines' array contains all lines modified in this commit
      // All lines in a commit have the same author, date, etc.
      // So we can get this information from the first line
      let first = lines[0];

      // We can use object destructuring to get these properties
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/k-phantastic/vis_class_portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,   // hide from loops & JSON.stringify
        writable: true,      // can modify later if needed
        configurable: true   // can redefine or delete later
      });

      return ret;
    });
}

// Render commit info statistics into the #stats element, creates table
function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    // Add total commits
    dl.append('dt').text('Commits');
    dl.append('dd').text(commits.length);

    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Add average LOC per commit
    const avgLOC = (data.length / commits.length).toFixed(0);
    dl.append('dt').html('Average <abbr title="Lines of code">LOC</abbr> per commit');
    dl.append('dd').text(avgLOC);

    // Number of files
    const uniqueFiles = new Set(data.map(d => d.file)).size;
    dl.append('dt').text('Files');
    dl.append('dd').text(uniqueFiles);

    // Maximum depth
    const maxDepth = d3.max(data, d => d.depth);
    dl.append('dt').text('Max Depth');
    dl.append('dd').text(maxDepth);

    // Average depth
    const avgDepth = (d3.mean(data, d => d.depth)).toFixed(1);
    dl.append('dt').text('Avg Depth');
    dl.append('dd').text(avgDepth);
}

// Create scatter plot
function renderScatterPlot(data, commits) {
    // Set up SVG and scales
    const width = 1000;
    const height = 600;

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`) 
        .style('overflow', 'visible'); // allow for axes labels outside the SVG area

    // Scales
    const xScale = d3 
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime)) // [min, max] of datetime 
        .range([0, width]) // map to [0, width]
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([height, 0]);
    
    // Draw circles
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue');
    
    // Margin and usable area 
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
}   

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);

renderScatterPlot(data, commits);

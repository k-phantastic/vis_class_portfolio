// Import d3 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Import Scrollama
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

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
      // Create commit object
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
      // Attach lines array as a non-enumerable property
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,   // hide from loops & JSON.stringify
        writable: true,      // can modify later if needed
        configurable: true   // can redefine or delete later
      });

      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime); // Sort by datetime
}

// Render commit info statistics into the #stats element, creates table
function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select('#web-commit-stats').append('dl').attr('class', 'stats');
  // Add total commits
  dl.append('dt').text('Commits');
  dl.append('dd').text(commits.length);

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Add average LOC per commit
  const avgLOC = (data.length / commits.length).toFixed(0);
  dl.append('dt').html('Avg <abbr title="Lines of code">LOC</abbr> / commit');
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

// Scales for scatter plot
let xScale, yScale;

// Create scatter plot
function renderScatterPlot(data, commits) {
  // Set up margin and usable area
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

    // Create SVG element
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`) 
    .style('overflow', 'visible'); // allow for axes labels outside the SVG area
  
  // Scales
  xScale = d3 
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime)) // [min, max] of datetime 
    .range([usableArea.left, usableArea.right]) // map to [0, width]
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);
  
  // Draw circles
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis') // new line to mark the g tag
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis') // just for consistency
    .call(yAxis);
  
  // Draw dots
  const dots = svg.append('g').attr('class', 'dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines); // Sort commits by total lines in descending order

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('fill', 'steelblue')
    .attr('r', (d) => rScale(d.totalLines))
    .style('--r', d => rScale(d.totalLines)) // CSS variable for transition
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
    });
    // Create brush selector
    createBrushSelector(svg);
}   

// Tooltip functions 
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const linesChanged = document.getElementById('commit-lines-edited');
    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    time.textContent = commit.datetime?.toLocaleString('en', {
        timeStyle: 'short',
    });
    linesChanged.textContent = commit.totalLines;
}

// Show/hide tooltip
function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

// Update tooltip position
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// Brush functions
function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
        isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

// Check if a commit is within the brush selection
function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }
    // Check if the commit is within the brush selection
    const [x0, x1] = selection.map((d) => d[0]); 
    const [y0, y1] = selection.map((d) => d[1]); 
    const x = xScale(commit.datetime); 
    const y = yScale(commit.hourFrac); 
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// Create brush selector on the SVG
function createBrushSelector(svg) {
    // Create brush
    svg.call(d3.brush().on('start brush end', brushed));

    // Raise dots and everything after overlay
    svg.selectAll('.dots, .overlay ~ *').raise();
}

// Render selection count 
function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
        selectedCommits.length || 'No'
    } commits selected`;

    return selectedCommits;
}

// Render language breakdown for selected commits 
function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '<dl></dl>';
  const dl = container.querySelector('dl');

  for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);

    dl.innerHTML += `
            <dt>${count} lines (${formatted})</dt>
            <dd>${language}:</dd>
        `;
  }
}

// Main execution

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);

renderScatterPlot(data, commits);

// Lab 8

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('--r', d => rScale(d.totalLines)) // CSS variable for transition
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// Maximum time we want to show as a percentage of total time let 
let commitProgress = 100;

// Create time scale from commits datetime to [0, 100] l
let timeScale = d3
  .scaleTime()
  .domain([ 
    d3.min(commits, (d) => d.datetime), 
    d3.max(commits, (d) => d.datetime), 
  ]) 
  .range([0, 100]); 
let commitMaxTime = timeScale.invert(commitProgress); 

// Select elements 
const commitSlider = document.getElementById("commit-progress"); 
const commitTimeDisplay = document.getElementById("commit-slider-time"); 
let filteredCommits = commits; // Will get updated as user changes slider

// function onTimeSliderChange() { 
//   let timeFilter = Number(commitSlider.value); 
//   // Get slider value 0-100 
//   commitMaxTime = timeScale.invert(timeFilter); 
//   // convert to actual Date
//   commitTimeDisplay.textContent = commitMaxTime.toLocaleString('en-US', { 
//     dateStyle: 'long',
//     timeStyle: 'short' 
//   }); 
//   filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
//   updateScatterPlot(data, filteredCommits);
//   updateFileDisplay(filteredCommits);
// }

// commitSlider.addEventListener('input', onTimeSliderChange); // Attach event listener
// onTimeSliderChange(); // Initialize display on page load

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      // This code only runs when the div is initially rendered
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        }),
    );

  // This code updates the div info

  filesContainer.select('dt')
    .html((d) => `
      <code>${d.name}</code>
      <small>${d.lines.length} lines</small>
    `);
  
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}

// Scroll filler text, each <div> tag has .step class
// May need to recopy over due to weird formatting
d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

function onStepEnter(response) {
  const commitTime = response.element.__data__.datetime; // Log the commit datetime associated with the step 
  const filteredCommits = commits.filter((d) => d.datetime <= commitTime);

  updateScatterPlot(data, filteredCommits); 
  updateFileDisplay(filteredCommits); 
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter)
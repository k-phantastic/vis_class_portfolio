// Import d3 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load CSV data
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

// Process commits
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

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
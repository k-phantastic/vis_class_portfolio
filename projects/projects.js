import { fetchJSON, renderProjects } from "../global.js"; // Import utility functions
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm'; // Import D3.js

const projects = await fetchJSON('../lib/projects.json'); 

const projectsContainer = document.querySelector('.projects'); 

renderProjects(projects, projectsContainer, 'h2');

const title = document.querySelector('.projects-title');
title.textContent = "Projects (" + projects.length + ")";

// Create a pie chart using D3.js
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50); // Arc generator for pie slices
let colors = d3.scaleOrdinal(d3.schemeTableau10); // Colors for the pie slices

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
    let newSVG = d3.select('svg');
    newSVG.selectAll('path').remove();
    // re-calculate rolled data
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );
    // re-calculate data
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
    // re-calculate slice generator, arc data, arc, etc.
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));
    // TODO: clear up paths and legends
    newArcs.forEach((arc, idx) => {
        newSVG
            .append('path')
            .attr('d', arc)
            .attr('fill', colors(idx)); // Append the pie slice to the SVG
    });
    // update paths and legends, refer to steps 1.4 and 2.2
    let newLegend = d3.select('.legend');
    newLegend.selectAll('li').remove(); // Clear existing legend items
    newData.forEach((d, idx) => {
        newLegend
            .append('li')
            .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
    });
}

// Call this function on page load
renderPieChart(projects);

// Search box 
function setQuery(query) {
    return projects.filter(project =>
        project.title.toLowerCase().includes(query.toLowerCase())
    );
}
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    let filteredProjects = setQuery(event.target.value);
    // re-render legends and pie chart when event triggers
    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
    title.textContent = `Projects (${filteredProjects.length})`;
});
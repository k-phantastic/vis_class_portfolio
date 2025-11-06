import { fetchJSON, renderProjects } from "../global.js"; // Import utility functions
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm'; // Import D3.js

const projects = await fetchJSON('../lib/projects.json'); 

const projectsContainer = document.querySelector('.projects'); 

renderProjects(projects, projectsContainer, 'h2');

const title = document.querySelector('.projects-title');
title.textContent = "Projects (" + projects.length + ")";

// Create a pie chart using D3.js
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50); // Arc generator for pie slices
let colors = d3.scaleOrdinal(d3.schemePastel1); // Colors for the pie slices

// Refactor all plotting into one function
let selectedIndex = -1; // No slice selected initially
let currentQuery = '';  // Track current search query globally

function renderPieChart(projectsGiven) {
    let newSVG = d3.select('svg');
    newSVG.selectAll('path').remove();

    // Re-calculate rolled data
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    // Re-calculate data
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    // Re-calculate slice generator, arc data, arc, etc.
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));

    // Clear up paths and legends, then add arcs
    let newLegend = d3.select('.legend');

    newArcs.forEach((arc, idx) => {
        newSVG
            .append('path')
            .attr('d', arc)
            .attr('fill', colors(idx)) // Append the pie slice to the SVG
            .on('click', () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;
                const selectedYear = selectedIndex === -1 ? null : newData[selectedIndex].label;

                console.log(`Clicked on slice: ${newData[idx].label}`);

                newSVG.selectAll('path').attr('class', (_, i) =>
                    selectedIndex === i ? 'selected' : ''
                );
                // const filteredProjects =
                //     selectedIndex === -1
                //         ? projects
                //         : projects.filter((p) => p.year === selectedYear);

                // renderProjects(filteredProjects, projectsContainer, 'h2');
                newLegend.selectAll('li')
                    .attr('class', (_, idx) =>
                        idx === selectedIndex ? 'selected' : null
                    );
                let filteredProjects = projects.filter((p) => {
                    let matchYear = selectedIndex === -1 || p.year === selectedYear;
                    let matchQuery = p.title.toLowerCase().includes(currentQuery.toLowerCase());
                    return matchYear && matchQuery;
                });

                renderProjects(filteredProjects, projectsContainer, 'h2');
                // renderPieChart(filteredProjects);
                title.textContent = `Projects (${filteredProjects.length})`;
            });
    });

    // Update legends
    newLegend.selectAll('li').remove(); // Clear existing legend items

    newData.forEach((d, idx) => {
        newLegend
            .append('li')
            .attr('style', `--color:${colors(idx)}`)
            .html(
                `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`
            );
    });
}

// Helper function to get selected year
function getSelectedYear() {
    if (selectedIndex === -1) return null;
    let rolled = d3.rollups(projects, v => v.length, d => d.year);
    let data = rolled.map(([year, count]) => ({ value: count, label: year }));
    return data[selectedIndex]?.label;
}

// Search box 
function setQuery(query) {
    currentQuery = query; // remember the search text
    const currentYear = getSelectedYear();

    // Combine both filters (search + selected slice)
    return projects.filter((p) => {
        let matchQuery = p.title.toLowerCase().includes(query.toLowerCase());
        let matchYear = selectedIndex === -1 || p.year === currentYear;
        return matchQuery && matchYear;
    });
}

// Attach event listener to search input
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
    let filteredProjects = setQuery(event.target.value); // get filtered projects
    console.log("Selected year: " + getSelectedYear());
    if (event.target.value === "") {
        // if search box is empty, show all projects in the pie chart
        renderPieChart(projects);
    } else {
        // optionally, show only the filtered projects in the pie chart
        renderPieChart(filteredProjects);
    }
    // Re-render projects based on search and selected slice as well as title   
    renderProjects(filteredProjects, projectsContainer, 'h2');
    title.textContent = `Projects (${filteredProjects.length})`;
});

// Call this function on page load
renderPieChart(projects);
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// let navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// if (currentLink) {
//   // or if (currentLink !== undefined)
//   currentLink?.classList.add('current');
// }

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'meta/', title: 'Meta' },
    { url: 'https://github.com/k-phantastic', title: 'GitHub' },
    // add the rest of your pages here
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/vis_class_portfolio/";         // GitHub Pages repo name


for (let p of pages) {
    let url = p.url;
    let title = p.title;
    // if (!ARE_WE_HOME && !url.startsWith('http')) {
    //     url = '../' + url;
    // }
    url = !url.startsWith('http') ? BASE_PATH + url : url;
    // TODO create link and add it to nav
    // Create link and add it to nav
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
    
    // if (a.host === location.host && a.pathname === location.pathname) {
    //     a.classList.add('current');
    // }
    // if (a.host === location.host) {
    //     a.classList.add('current');
    // }
    if (a.host === location.host && a.pathname === location.pathname) {
        const currentPath = location.pathname.endsWith('/') ? location.pathname + 'index.html' : location.pathname;
        const linkPath = a.pathname.endsWith('/') ? a.pathname + 'index.html' : a.pathname;
        if (linkPath === currentPath) {
            a.classList.add('current');
        }
    }
    if (a.host !== location.host) {
        a.target = '_blank';
    }
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
		</select>
	</label>`
);

let select = document.querySelector("select");

select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value
});

if ("colorScheme" in localStorage) {
    let saved = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', saved);
    select.value = saved;
}

let form = document.querySelector('form');
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(form);
    let form_url = form.action + "?";
    let first = true;
    for (let [name, value] of data) {
        // TODO build URL parameters here
        //  mailto:leaverou@mit.edu?subject=Hello&body=Sup?
        if (!first) form_url += "&";
        form_url += name + "=" + encodeURIComponent(value);
        first = false;
    }
    console.log(form_url);
    location.href = form_url;
});

export async function fetchJSON(url) {
    try { 
        // Fetch the JSON file from the given URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        } 
        console.log('Response', response);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    // Validating containerElement, usually to select a class 
    if (!(containerElement instanceof HTMLElement)) {
        console.error('Invalid containerElement: Expected an HTML element.');
        return;
    }
    // Validate headingLevel to be one of h1 to h6
    const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (!validHeadings.includes(headingLevel)) {
        console.warn(`Invalid headingLevel "${headingLevel}". Defaulting to "h2".`);
        headingLevel = 'h2';
    }
    // Validate projects 
    if (!Array.isArray(projects)) {
        console.error('Invalid projects data: Expected an array of project objects.');
        return;
    }
    projects.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); // Sort projects by year descending
    containerElement.innerHTML = ''; // Clear existing content, ensure container is empty to avoid duplication
    for (const project of projects) {
        // Fallback values
        const title = project?.title ?? 'Untitled Project';
        const image = project?.image ?? 'https://vis-society.github.io/labs/2/images/empty.svg';
        const description = project?.description ?? 'No description available.';
        const year = project?.year ?? '';
        // Create article element for each project
        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${title}</${headingLevel}>
            <p class="project-year"><strong>${year}</strong></p>
            <img src="${image}" alt="${title}">
            <p>${description}</p>
        `;
        containerElement.appendChild(article);
    }
}

export async function fetchGitHubData(username) {
  // return statement here
  return fetchJSON(`https://api.github.com/users/${username}`);
}
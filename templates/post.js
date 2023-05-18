import * as base from 'templates/base.js';

const forEach = (arr, fn) => {
  let i, str = '';
  for (i = 0; i < arr.length; i++) str += fn(arr[i]) || '';
  return str;
};

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDate = (date) => {
  const d = new Date(date);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const template = ({ title, date, slug, contents, tableOfContents }) => base.template({
  title,
  contents: `
    <div class="controls p1">
        <a href="https://github.com/kevinfiol/kevinfiol.com/edit/master/content/blog/${slug}.md">edit</a>
    </div>

    <header>
        <nav>
            <p class="h3">
                <a href="/">kevin f.</a>
            </p>
        </nav>
    </header>

    <small class="h5 p0 m0 light-subdue">
        ${formatDate(date)}
    </small>

    ${tableOfContents.length > 0 ? `
        <aside>
            <div class="toc h5 py1">
                <ul>
                    ${forEach(tableOfContents, header => `
                        <li><a title="${header.text}" href="#${header.id}">${header.text}</a></li>
                    `)}
                </ul>
            </div>
        </aside>
    ` : ''
    }

    <article class="page-content">
        ${ contents }
    </article>

    <footer class="mt2">
        <small>
            <a href="#">return to top</a>
        </small>
    </footer>
  `
});
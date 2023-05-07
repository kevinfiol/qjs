import * as base from 'templates/base.js';

export const template = ({ title, date, slug, contents }) => base.template({
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
        ${date}
    </small>

    <aside>
    </aside>

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
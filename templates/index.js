import * as base from 'templates/base.js';

const forEach = (arr, fn) => {
  let i, str = '';
  for (i = 0; i < arr.length; i++) str += fn(arr[i]);
  return str;
};

export const template = ({ title, blog }) => base.template({
  title,
  contents: `
    <div class="controls p1">
        <a href="https://github.com/kevinfiol/kevinfiol.com/new/master/content/blog">new</a>
    </div>

    <header>
        <div style="width: 200px; height: 200px;">
            <img
              loading="lazy"
              class="fade-in"
              style="width: 100%; height: auto; fill: currentColor;"
              src="/img/spes.png"
              alt="astronaut sitting at a computer"
            />
        </div>
        <h1 class="mb0" style="font-weight: 400">kevin f.</h1>
        <nav>
            <ul class="list-reset my1">
                <li class="inline-block mr2"><a href="about">about</a></li>
                <li class="inline-block mr2"><a href="https://github.com/kevinfiol">github</a></li>
                <li class="inline-block mr2"><a href="/resume/">resume</a></li>
            </ul>
        </nav>
        <p class="my1" style="font-size: 0.9em">contact: <a href="mailto:me@kevinfiol.com">me@kevinfiol.com</a></p>
        <p class="mb1 mt0 light-subdue"><small><em>spaceman mascot by <a href="https://twitter.com/Haggle">twitter.com/haggle</a></em></small></p>
    </header>

    <div class="line" aria-hidden="true"></div>

    <section>
        ${forEach(blog, entry => `
            <article class="archive-link">
                <time datetime="${entry.date}">${entry.date.replaceAll('-', '.')}</time>
                -
                <header style="display: inline;"><a href="/blog/${entry.slug}">${entry.title}</a></header>
            </article>
        `)}
    </section>

    <nav class="py1">
        <a href="/archive/">archive →</a>
    </nav>
  `
});
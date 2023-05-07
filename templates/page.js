import * as base from 'templates/base.js';

export const template = ({ title, contents }) => base.template({
  title,
  contents: `
    <h1>
        <a href="/">kevin f.</a>
    </h1>
    <div class="line" aria-hidden="true"></div>
    <div class="page-content">
        ${ contents }
    </div>
  `
});
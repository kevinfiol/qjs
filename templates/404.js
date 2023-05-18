import * as base from 'templates/base.js';

export const template = ({ title }) => base.template({
  title,
  contents: `
    <div class="center max-width-2 mx-auto">
        <p class="h4">
            <a href="/">kevin f.</a>
            <h1>404</h1>
            <p>page not found</p>
        </p>
    </div>
  `
});
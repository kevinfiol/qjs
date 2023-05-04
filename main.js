import { loadFile, open } from 'std';
import { parse } from './lib/marked.js';

// https://bellard.org/quickjs/quickjs.html

// monkey patch console.warn for marked.js
console.warn = () => {};

const contents = loadFile('./test.md');
const html = parse(contents);

// use C `fopen` flags
const file = open('./hey.html', 'w+');
file.puts(html);
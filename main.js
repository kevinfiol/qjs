import { loadFile, open } from 'std';
import { readdir, realpath, mkdir } from 'os';
import { parse } from './lib/marked.js';

const CONTENT_DIR = './content/';
const TEMPLATE_DIR = './templates/';
const DIST_DIR = './dist/';
const TEMPLATES = {};

// https://bellard.org/quickjs/quickjs.html

// monkey patch console.warn for marked.js
console.warn = () => {};

(async () => {
  try {
    const [files, error] = readdir(CONTENT_DIR);

    for (const filename of files) {
      const [name, ext] = filename.split('.');
      if (ext !== 'md') continue;

      const [path, pathError] = realpath(CONTENT_DIR + filename);
      if (pathError) throw Error('Unable to read path: ' + filename);

      const fileContents = loadFile(path);
      const [{ markdown, data }, dataError] = parseFrontMatter(fileContents);
      if (dataError) throw dataError;

      const [tplPath, tplPathError] = realpath(TEMPLATE_DIR + data.template);
      if (tplPathError) throw Error('Unable to read path: ' + data.template);

      // parse markdown
      const contents = parse(markdown);

      // load template
      const template = TEMPLATES[tplPath] ?? (await import(tplPath)).template;
      if (!TEMPLATES[tplPath]) TEMPLATES[tplPath] = template;

      // inject into template
      const html = template({ ...data, contents });

      // determine paths for html files
      const [distPath] = realpath(DIST_DIR);
      const htmlFilePath = name === 'index' ? 'index.html' : (name + '/index.html');

      // make directory for non-index pages
      if (name !== 'index') mkdir(distPath + '/' + name);

      // write html
      const file = open(distPath + '/' + htmlFilePath, 'w+');
      file.puts(html);
      file.close();
    }
  } catch (e) {
    console.log(e);
  }
})();

function parseFrontMatter(contents) {
  let obj = { markdown: '', data: {} };
  let error = undefined;
  const match = contents.match(/^(\s*\+{3}\n)([\s\S]*?)(\+{3}\n)([\s\S]*)/);

  try {
    if (!match) throw Error('no front matter detected');
    const matter = match[2];
    const markdown = match[4].trim();

    const json = matter.replace(/(\w+)\s*=\s*(".*?"|\d+)/g, '"$1":$2');
    const validJson = '{' + json.trim().split('\n').join(',') + '}';

    obj.markdown = markdown;
    obj.data = JSON.parse(validJson);
  } catch (e) {
    error = e;
  }

  return [obj, error];
}

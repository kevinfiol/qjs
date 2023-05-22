import { loadFile, open, strerror, parseExtJSON } from 'std';
import { readdir, realpath, mkdir, remove, getcwd } from 'os';
import { marked } from 'lib/marked.js';
import prism from 'lib/prism.js';

const CONTENT_DIR = getAbsPath('./content/');
const TEMPLATE_DIR = './templates/';
const DIST_DIR = './dist/';
const TEMPLATES = {};

// monkey patch console.warn for marked.js
console.warn = () => {};

let HEADERS = [];

const renderer = (anchors = false) => ({
  code(code, info) {
    let html = code;
    if (info) {
      try {
        if (info === 'js') info = 'javascript';
        html = prism.highlight(code, prism.languages[info], info);
      } catch (e) {
        console.log('No language grammar available for: ', info);
      }
    }

    return `<pre><code>${html}</code></pre>`;
  },

  heading(text, level, raw) {
    const id = createSlug(raw);
    let html = `<h${level} id="${id}">`;

    if (level > 1 && anchors) {
      html += `<a aria-label="Anchor link for: ${id}" class="zola-anchor" href="#${id}">#</a>`;
      HEADERS.push({ text, id });
    }

    html += `${text}</h${level}>`;
    return html;
  },

  image(href, _title, text) {
    return `<div style="text-align: center; width: 100%;"><a href="${href}"><img loading="lazy" src="${href}" alt="${text}" /></a></div>`;
  }
});

(async () => {
  try {
    if (scriptArgs.includes('clean')) {
      const contentFiles = readDirFiles(CONTENT_DIR);
      for (const file of contentFiles) {
        let [name, ext] = file.split('.');
        if (['404', 'index'].includes(name)) name += '.html';
        const [distFilePath, error] = realpath(DIST_DIR + name);
        if (!error) removeAll(distFilePath); // remove from dist dir if it exists
      }

      return;
    }

    const { queue, blogData } = await processDir(CONTENT_DIR, DIST_DIR, []);

    const jobs = [];
    for (const job of queue) {
      jobs.push(job(blogData));
    }

    await Promise.all(jobs);
  } catch (e) {
    console.log(e);
  }
})();

async function processDir(contentDir, distDir, queue, blogData = {}) {
  let mdFiles = readDirFiles(contentDir);

  for (const filename of mdFiles) {
    const [name, ext] = filename.split('.');
    const slug = createSlug(name);

    if (ext !== 'md') {
      // not a markdown file; check if directory
      const subContentDir = getAbsPath(contentDir, filename);
      if (!isDirectory(subContentDir)) continue;

      const subDistDir = normalize(distDir, filename);
      mkdir(subDistDir);
      blogData[filename] = {};

      // traverse subdirectory for markdown files
      await processDir(subContentDir + '/', subDistDir, queue, blogData[filename]);
      continue;
    }

    const mdFilePath = getAbsPath(contentDir, filename);
    const [{ markdown, data }, dataError] = parseContentFile(mdFilePath);
    if (dataError) throw dataError;

    blogData[slug] = { ...data, filename, slug, path: mdFilePath.split(CONTENT_DIR)[1].split('.md')[0] };
    const tplPath = getAbsPath(TEMPLATE_DIR, data.template);

    marked.use({ renderer: renderer(['post.js', 'page.js'].includes(data.template)) });
    const htmlSnippet = marked.parse(markdown);

    // get headers for table of contents
    const tableOfContents = [...HEADERS];
    HEADERS = [];

    // load template; cache it if already loaded
    const template = TEMPLATES[tplPath] ?? (await import(tplPath)).template;
    if (!TEMPLATES[tplPath]) TEMPLATES[tplPath] = template;

    queue.push(async (blogData) => {
      // inject snippet and metadata into template
      const html = template({
        ...data,
        contents: htmlSnippet,
        slug,
        site: blogData,
        tableOfContents
      });

      // determine paths for html files
      const distPath = getAbsPath(distDir);
      const htmlFilePath = ['index', '404'].includes(name) ? `${name}.html` : (name + '/index.html');

      // make directory for non-index pages
      if (!['index', '404'].includes(name)) mkdir(normalize(distPath, name));

      // write html
      const file = open(normalize(distPath, htmlFilePath), 'w+');
      file.puts(html);
      file.close();
    });
  }

  return { queue, blogData };
}

function getAbsPath(...args) {
  const relativePath = normalize(...args);
  const [path, error] = realpath(relativePath);
  if (error) throw Error('Unable to get absolute path: ' + strerror(error))
  return path;
}

function readDirFiles(dir) {
  const [files, error] = readdir(dir);
  if (error) throw Error('Unable to read directory files: ' + strerror(error));
  return files.filter(file => file !== '..' && file !== '.'); // don't return relative paths
}

function removeAll(path) {
  path = normalize(path);

  if (isDirectory(path)) {
    const files = readDirFiles(path);

    for (const file of files) {
      removeAll(path + '/' + file);
    }
  }

  remove(path);
}

function isDirectory(path) {
  const [_, error] = readdir(path);
  return !error;
}

function normalize(...args) {
  const tokens = [];
  let len = -1;

  for (let arg of args) {
    let last = tokens[len];

    if (last && !['/', '\\'].includes(last[last.length - 1])) {
      tokens[len] += '/';
    }

    len += 1;
    tokens.push(arg);
  }

  let path = tokens.join('');

  if (path[path.length - 1] === '/') {
    path = path.slice(0, -1);
  }

  return path;
}

function parseContentFile(path) {
  let data, error;
  let markdown = '';

  const file = open(path, 'r');
  while (!file.eof()) {
    const line = file.getline();

    if (!data) {
      try {
        // load first line as metadata
        data = parseExtJSON('{' + line + '}');
        continue;
      } catch (e) {
        e.message = path + ' ' + e.message;
        error = e;
        break;
      }
    }

    markdown += (line || '') + '\n';
  }

  return [{ markdown, data }, error];
}

function createSlug(text) {
  let lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const slug = lines[i].toString().toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text

    if (slug.length > 0) return slug;
  }

  return '';
}

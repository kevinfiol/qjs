import { loadFile, open, strerror, parseExtJSON } from 'std';
import { readdir, realpath, mkdir, remove, O_TEXT } from 'os';
import { parse } from 'lib/marked.js';

const CONTENT_DIR = './content/';
const TEMPLATE_DIR = './templates/';
const DIST_DIR = './dist/';
const TEMPLATES = {};
const BLOG_DATA = [];

// https://bellard.org/quickjs/quickjs.html

// monkey patch console.warn for marked.js
console.warn = () => {};

(async () => {
  try {
    // clean dir first
    const contentFiles = readDirFiles(CONTENT_DIR);
    for (const file of contentFiles) {
      let [name, ext] = file.split('.');
      if (name === 'index') name += '.html';
      const [distFilePath, error] = realpath(DIST_DIR + name);
      if (!error) removeAll(distFilePath); // remove from dist dir if it exists
    }

    await processDir(CONTENT_DIR, DIST_DIR);
  } catch (e) {
    console.log(e);
  }
})();

async function processDir(contentDir, distDir) {
  let mdFiles = readDirFiles(contentDir);

  for (const filename of mdFiles) {
    const [name, ext] = filename.split('.');
    const slug = createSlug(name);

    if (ext !== 'md') {
      // not a markdown file; check if directory
      const subContentDir = getAbsPath(contentDir + filename);
      if (!isDirectory(subContentDir)) continue;

      const subDistDir = getAbsPath(distDir) + '/' + filename;
      mkdir(subDistDir);

      // traverse subdirectory for markdown files
      await processDir(subContentDir + '/', subDistDir);
      continue;
    }

    const mdFilePath = getAbsPath(contentDir + filename);
    const [{ markdown, data }, dataError] = parseContentFile(mdFilePath);
    if (dataError) throw dataError;

    const tplPath = getAbsPath(TEMPLATE_DIR + data.template);
    const htmlSnippet = parse(markdown);

    // load template; cache it if already loaded
    const template = TEMPLATES[tplPath] ?? (await import(tplPath)).template;
    if (!TEMPLATES[tplPath]) TEMPLATES[tplPath] = template;

    // inject snippet and metadata into template
    const html = template({
      ...data,
      contents: htmlSnippet,
      slug,
      blog: BLOG_DATA
    });

    // determine paths for html files
    const distPath = getAbsPath(distDir);
    const htmlFilePath = name === 'index' ? 'index.html' : (name + '/index.html');

    // make directory for non-index pages
    if (name !== 'index') mkdir(distPath + '/' + name);

    // write html
    const file = open(distPath + '/' + htmlFilePath, 'w+');
    file.puts(html);
    file.close();
  }
}

function getAbsPath(relativePath) {
  const [path, error] = realpath(relativePath);
  if (error) throw Error('Unable to get absolute path: ' + strerror(error));
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

function copy(pathA, pathB) {
  pathA = normalize(pathA);
  pathB = normalize(pathB);

  if (isDirectory(pathA)) {
    mkdir(pathB);
    const files = readDirFiles(pathA);

    for (const file of files) {
      copy(pathA + '/' + file, pathB + '/' + file);
    }
  } else {
    const a = open(pathA, 'r'); // open a for reading
    const b = open(pathB, 'w+'); // open b for writing

    let byte;
    while ((byte = a.getByte()) > -1) {
      b.putByte(byte);
    }

    a.close();
    b.close();
  }
}

function isDirectory(path) {
  const [_, error] = readdir(path);
  return !error;
}

function normalize(path) {
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

    markdown += line + '\n';
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

import { loadFile, open, strerror } from 'std';
import { readdir, realpath, mkdir, remove } from 'os';
import { parse } from './lib/marked.js';

const CONTENT_DIR = './content/';
const TEMPLATE_DIR = './templates/';
const DIST_DIR = './dist/';
const PUBLIC_DIR = './public/';
const TEMPLATES = {};

// https://bellard.org/quickjs/quickjs.html

// monkey patch console.warn for marked.js
console.warn = () => {};

(async () => {
  try {
    // create top level dist directory
    mkdir(DIST_DIR);

    // copy public files
    const publicFiles = readDirFiles(PUBLIC_DIR);
    for (const file of publicFiles) {
      const [distFilePath, error] = realpath(DIST_DIR + file);
      if (!error) removeAll(distFilePath); // remove from dist dir if it exists
      copy(PUBLIC_DIR, DIST_DIR);
    }

    await processDir(CONTENT_DIR, DIST_DIR);
  } catch (e) {
    console.log(e);
  }
})();

async function processDir(contentDir, distDir) {
  const mdFiles = readDirFiles(contentDir);

  for (const filename of mdFiles) {
    const [name, ext] = filename.split('.');

    if (ext !== 'md') {
      // not a markdown file; check if directory
      const subContentDir = getAbsPath(contentDir + filename);
      if (!isDirectory(subContentDir)) continue;

      const subDistDir = getAbsPath(distDir) + '/' + filename;
      mkdir(subDistDir);

      // traverse subdirectory for markdown files
      processDir(subContentDir + '/', subDistDir);
      continue;
    }

    const mdFilePath = getAbsPath(contentDir + filename);
    const mdFileContents = loadFile(mdFilePath);

    const [{ markdown, data }, dataError] = parseFrontMatter(mdFileContents);
    if (dataError) throw dataError;

    const tplPath = getAbsPath(TEMPLATE_DIR + data.template);
    const htmlSnippet = parse(markdown);

    // load template; cache it if already loaded
    const template = TEMPLATES[tplPath] ?? (await import(tplPath)).template;
    if (!TEMPLATES[tplPath]) TEMPLATES[tplPath] = template;

    // inject snippet and metadata into template
    const html = template({ ...data, contents: htmlSnippet, slug: createSlug(name) });

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

    remove(path);
  } else {
    remove(path);
  }
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

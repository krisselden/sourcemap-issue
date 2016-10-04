const fs = require('fs');
const path = require('path');
const optimizeJs = require('optimize-js');
const sorcery = require('sorcery');
const sourceUrl = require('source-map-url');
const validate = require('sourcemap-validator');

const BASE64 = 'base64,';

let original = readSrc('bower_components/jquery/dist', 'jquery.slim.js');
let minified = readSrc('bower_components/jquery/dist', 'jquery.slim.min.js', 'jquery.slim.min.map');

let optimized = optimize(minified, 'jquery.slim.opt.js', minified.file);
let map = resolveChain(original, minified, optimized);

fs.writeFileSync(optimized.file, optimized.code + '//# sourceMappingURL=' + optimized.file + '.map');
fs.writeFileSync(optimized.file + '.map', JSON.stringify(map, null, 2));


let uglified = minify(original, 'jquery.slim.min.js');
optimized = optimize(uglified, 'jquery.slim.uglify-opt.js', uglified.file);
map = resolveChain(original, uglified, optimized);

fs.writeFileSync(optimized.file, optimized.code + '//# sourceMappingURL=' + optimized.file + '.map');
fs.writeFileSync(optimized.file + '.map', JSON.stringify(map, null, 2));

function minify(source, file) {
  let UglifyJS = require('uglify-js');

  let ast = UglifyJS.parse(source.code, { filename: source.file });
  ast.figure_out_scope();

  let compressor = UglifyJS.Compressor();
  ast = ast.transform(compressor);

  ast.figure_out_scope();
  ast.compute_char_frequency();
  ast.mangle_names();

  let source_map = UglifyJS.SourceMap();
  let stream = UglifyJS.OutputStream({
    source_map
  });
  ast.print(stream);

  let code = stream.toString();
  let map = source_map.get().toJSON();
  return { code, file, map };
}

function resolveChain(original, minified, optimized) {
  let content = Object.create(null);
  content[original.file] = original.code;
  content[minified.file] = minified.code;
  content[optimized.file] = optimized.code;

  let sourcemaps = Object.create(null);
  sourcemaps[minified.file] = minified.map;
  sourcemaps[optimized.file] = optimized.map;

  let chain = sorcery.loadSync(optimized.file, { content, sourcemaps });
  let resolvedMap = chain.apply({
    includeContent: true
  });

  validate(minified.code, JSON.stringify(minified.map), content);
  try {
    validate(optimized.code, JSON.stringify(resolvedMap), content);
  } catch (e) {
    console.error(e);
  }
  return resolvedMap;
}

function optimize(minified, file, source) {
  let code = optimizeJs(minified.code, { sourceMap: true, file, source });
  let map = parseMap(sourceUrl.getFrom(code));
  code = sourceUrl.removeFrom(code);
  return { file, code, map };
}

function readSrc(dir, srcFile, mapFile) {
  return {
    file: srcFile,
    code: fs.readFileSync(path.join(dir, srcFile), 'utf8'),
    map: mapFile ? JSON.parse(fs.readFileSync(path.join(dir, mapFile), 'utf8')) : undefined
  };
}

function parseMap(url) {
  let index = url.indexOf(BASE64);
  let base64 = url.slice(index + BASE64.length);
  return JSON.parse(new Buffer(base64, 'base64').toString('utf8'));
}
const MagicString = require('magic-string');
const acorn = require('acorn');
const walk = require('estree-walker').walk;
const sorcery = require('sorcery');
const fs = require('fs');
const validate = require('sourcemap-validator');

function testCase(fix) {
  let original = {
    file: 'original.js',
    code: `
define("hello", ["exports"], function (exports) {
  !function () {
    var hello = function hello() {
      !function () {
        console.log('hello');
      }();
    };
    exports.default = hello;
  }();
});
`

  };
  let mangled = mangleIdentifier(original, 'mangled.js', 'hello', 'a');
  let wrapped = wrap(mangled, 'wrapped.js', fix);

  let content = Object.create(null);
  content[original.file] = original.code;
  content[mangled.file] = mangled.code;
  content[wrapped.file] = wrapped.code;

  let sourcemaps = Object.create(null);
  sourcemaps[mangled.file] = mangled.map;
  sourcemaps[wrapped.file] = wrapped.map;

  let chain = sorcery.loadSync(wrapped.file, { content, sourcemaps });
  wrapped.map = chain.apply({ includeContent: true });

  validate(wrapped.code, JSON.stringify(wrapped.map),  content);

  return wrapped;
}

let noFix = testCase();
let fixSetLocations = testCase(setNodeLocations);

fs.writeFileSync('no-fix.js', noFix.code + '//# sourceMappingURL=no-fix.js.map');
fs.writeFileSync('no-fix.js.map', JSON.stringify(noFix.map, null, 2));

fs.writeFileSync('fix-set-locations.js', fixSetLocations.code + '//# sourceMappingURL=fix-set-locations.js.map');
fs.writeFileSync('fix-set-locations.js.map', JSON.stringify(fixSetLocations.map, null, 2));


function mangleIdentifier(source, file, name, replacement) {
  let magicString = new MagicString(source.code);
  let ast = acorn.parse(source.code);
  walk(ast, {
    enter(node) {
      // mark boundaries of things
      magicString.addSourcemapLocation(node.start);
      magicString.addSourcemapLocation(node.end);
      if (node.type === 'Identifier') {
        // create mapping with name
        if (node.name === name) {
          magicString.overwrite(node.start, node.end, replacement, true);
        }
      }
    }
  });
  return {
    file: file,
    code: magicString.toString(),
    map: magicString.generateMap({
      file: file,
      source: source.file
    })
  };
}

function wrap(source, file, fix) {
  let magicString = new MagicString(source.code);
  let ast = acorn.parse(source.code);
  if (fix) {
    fix(magicString, ast);
  }

  walk(ast, {
    enter(node, parentNode) {
      if (node.type === 'FunctionExpression') {
        if (parentNode && parentNode.type === 'CallExpression') {
          if (parentNode.arguments.length && parentNode.arguments.indexOf(node) !== -1) {
            magicString = magicString.insertLeft(node.start, '(')
              .insertRight(node.end, ')')
          } else if (parentNode.callee === node) {
            magicString.insertLeft(node.start, '(')
              .insertRight(node.end, ')')
          }
        }
      }
    }
  });

  return {
    file: file,
    code: magicString.toString(),
    map: magicString.generateMap({
      file: file,
      source: source.file
    })
  };
}

function setNodeLocations(magicString, ast) {
  walk(ast, {
    enter(node) {
      // mark boundaries of things
      magicString.addSourcemapLocation(node.start);
      magicString.addSourcemapLocation(node.end);
    }
  });
}

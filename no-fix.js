
define("hello", ["exports"], (function (exports) {
  !(function () {
    var a = function a() {
      !(function () {
        console.log('hello');
      })();
    };
    exports.default = a;
  })();
}));
//# sourceMappingURL=no-fix.js.map
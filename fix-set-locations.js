
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
//# sourceMappingURL=fix-set-locations.js.map
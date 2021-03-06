/**
 * Lodash Latest Constant
 * @namespace refineryApp
 * @desc Issue with adding the lodash-latest from the window object to the
 * refinery-library due to script run time.
 * @memberOf refineryApp.lodashLatest
 */
(function () {
  'use strict';

  angular
    .module('lodashLatest', [])
    .constant('_', window._);
})();

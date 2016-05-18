'use strict';

function fileSources ($resource, settings, dataSetImportSettings) {
  return $resource(
    settings.appRoot +
    dataSetImportSettings.checkFiles,
    {},
    {
      check: {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    }
  );
}

angular
  .module('refineryDataSetImport')
  .factory('fileSources', [
    '$resource',
    'settings',
    'dataSetImportSettings',
    fileSources
  ]);

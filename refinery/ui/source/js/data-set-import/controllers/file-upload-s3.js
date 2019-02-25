(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('RefineryFileUploadS3Ctrl', RefineryFileUploadS3Ctrl);

  RefineryFileUploadS3Ctrl.$inject = [
    '$log',
    '$scope',
    '$window',
    'addFileToDataSetService',
    'fileUploadStatusService',
    's3UploadService'
  ];

  function RefineryFileUploadS3Ctrl (
    $log,
    $scope,
    $window,
    addFileToDataSetService,
    fileUploadStatusService,
    s3UploadService) {
    var vm = this;
    vm.files = [];
    vm.multifileUploadInProgress = false;

    vm.isUploadConfigured = function () {
      if (s3UploadService.isConfigReady) {
        return s3UploadService.isConfigValid();
      }
      return false;
    };

    vm.addFiles = function (files) {
      vm.files = vm.files.concat(files);
      fileUploadStatusService.setFileUploadStatus('queuing');
    };

    vm.isFileNew = function (file) {
      // check if file upload has been attempted
      return !('progress' in file);
    };

    vm.isUploadInProgress = function (file) {
      if (vm.isFileNew(file) || file.$error || file.success) {
        return false;
      }
      return file.progress <= 100;
    };

    vm.areUploadsInProgress = function () {
      if (vm.files.length === 0) {
        return false;
      }
      return vm.files.some(vm.isUploadInProgress);
    };

    vm.isUploadComplete = function (file) {
      return Boolean(file.$error || file.success);
    };

    vm.areUploadsCancellable = function () {
      if (vm.files.length === 0) {
        return false;
      }
      return !vm.files.every(vm.isUploadComplete);
    };

    vm.areUploadsEnabled = function () {
      if (vm.files.length === 0 || vm.areUploadsInProgress()) {
        return false;
      }
      return vm.files.some(vm.isFileNew);
    };

    vm.uploadFile = function (file) {
      try {
        file.managedUpload = s3UploadService.upload(file);
      } catch (e) {
        file.progress = 100;
        file.$error = 'Data upload configuration error';
        return;
      }
      fileUploadStatusService.setFileUploadStatus('running');
      file.progress = 0;
      file.managedUpload.on('httpUploadProgress', function (progress) {
        // $applyAsync is used to avoid $rootScope:inprog error when canceling uploads
        $scope.$applyAsync(function () {
          if (progress.total) {
            file.progress = (progress.loaded / progress.total) * 100;
          }
        });
      });
      file.managedUpload.promise().then(function () {
        $scope.$apply(function () {
          file.success = true;
          fileUploadStatusService.setFileUploadStatus('none');
          if (vm.isNodeUpdate) {
            addFileToDataSetService.update({
              node_uuid: vm.nodeUuid,
              identity_id: AWS.config.credentials.identityId
            }).$promise
              .then(function () {
                vm.addFileStatus = 'success';
              }, function () {
                vm.addFileStatus = 'error';
              });
          }
          if (vm.multifileUploadInProgress) {
            vm.uploadFiles();
          }
        });
      }, function (error) {
        $scope.$apply(function () {
          file.progress = 100;
          file.$error = error;
          $log.error('Error uploading file ' + file.name + ': ' + file.$error);
          fileUploadStatusService.setFileUploadStatus('none');
          if (vm.multifileUploadInProgress) {
            vm.uploadFiles();
          }
        });
      });
    };

    vm.uploadFiles = function () {
      vm.multifileUploadInProgress = true;
      for (var i = 0; i < vm.files.length; i++) {
        if (vm.isFileNew(vm.files[i])) {
          vm.uploadFile(vm.files[i]);
          // to enable sequential uploads
          return;  // uploadFiles() will be called again from uploadFile()
        }
      }
      vm.multifileUploadInProgress = false;
    };

    vm.cancelUpload = function (file) {
      if (vm.isFileNew(file)) {
        var position = vm.files.indexOf(file);
        if (position > -1) {
          vm.files.splice(position, 1);
        }
      }
      if (vm.isUploadInProgress(file)) {
        file.managedUpload.abort();
        $log.warn('Upload canceled: ' + file.name);
      }
      if (vm.areUploadsEnabled()) {
        fileUploadStatusService.setFileUploadStatus('queuing');
      } else if (vm.areUploadsInProgress()) {
        fileUploadStatusService.setFileUploadStatus('running');
      } else {
        fileUploadStatusService.setFileUploadStatus('none');
      }
    };

    vm.cancelUploads = function () {
      // this iteration approach is necessary because vm.files is re-indexed in cancelUpload()
      var index = vm.files.length;
      while (index--) {
        vm.cancelUpload(vm.files[index]);
      }
    };
  }
})();

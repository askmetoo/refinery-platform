'''
Created on May 11, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from data_set_manager.views import (
    DataSetImportView, ImportISATabView, ProcessISATabView,
    ProcessMetadataTableView, CheckDataFilesView, ChunkedFileUploadView,
    ChunkedFileUploadCompleteView)


urlpatterns = patterns(
    'data_set_manager.views',
    url(r'^$', 'index', name="data_set_manager_base"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/types/'
        r'$', "node_types", name="data_set_manager_node_types"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<assay_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/types/'
        r'$', "node_types", name="data_set_manager_node_types"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'types_files/$', "node_types_files",
        name="data_set_manager_node_types_files"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<assay_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'types_files/$', "node_types_files",
        name="data_set_manager_node_types_files"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'attributes/(?P<type>[\w ]+)/$', "node_attributes",
        name="data_set_manager_node_attributes"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<assay_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'attributes/(?P<type>[\w ]+)/$', "node_attributes",
        name="data_set_manager_node_attributes"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<assay_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<type>[\w ]+)/$', "nodes", name="data_set_manager_nodes"),
    url(r'^nodes/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<assay_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<type>[\w ]+)/annotate$', "node_annotate",
        name="data_set_manager_update_annotated_nodes"),
    url(r'^import/$', login_required(DataSetImportView.as_view()),
        name='import_data_set'),
    # csrf_exempt required for POST requests from external sites
    url(r'^import/isa-tab/$', csrf_exempt(ImportISATabView.as_view()),
        name='import_isa_tab'),
    url(r'^import/isa-tab-form/$', login_required(ProcessISATabView.as_view()),
        name='process_isa_tab'),
    url(r'^contents/(?P<study_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'(?P<assay_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$',
        "contents", name="data_set_manager_contents"),
    url(r'^import/metadata-table-form/$',
        login_required(ProcessMetadataTableView.as_view()),
        name='process_metadata_table'),
    url(r'^import/check_files/$', CheckDataFilesView.as_view(),
        name='check_files'),
    url(r'^import/chunked-upload/$',
        login_required(ChunkedFileUploadView.as_view()),
        name='api_chunked_upload'),
    url(r'^import/chunked-upload-complete/$',
        login_required(ChunkedFileUploadCompleteView.as_view()),
        name='api_chunked_upload_complete'),
)

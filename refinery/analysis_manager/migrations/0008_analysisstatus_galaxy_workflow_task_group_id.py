# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0007_analysisstatus_galaxy_export_task_group_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='temp_uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE analysis_manager_analysisstatus SET temp_uuid = CAST (galaxy_workflow_task_group_id AS uuid)",
            "UPDATE analysis_manager_analysisstatus SET galaxy_workflow_task_group_id = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='analysisstatus',
            name='galaxy_workflow_task_group_id',
        ),
        migrations.RenameField(
            model_name='analysisstatus',
            old_name='temp_uuid',
            new_name='galaxy_workflow_task_group_id',
        ),
    ]

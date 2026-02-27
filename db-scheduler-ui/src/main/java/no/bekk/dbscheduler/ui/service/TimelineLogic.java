/*
 * Copyright (C) Bekk
 *
 * <p>Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 * <p>http://www.apache.org/licenses/LICENSE-2.0
 *
 * <p>Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
package no.bekk.dbscheduler.ui.service;

import java.time.Instant;
import java.util.List;
import no.bekk.dbscheduler.ui.model.GetLogsResponse;
import no.bekk.dbscheduler.ui.model.GetTasksResponse;
import no.bekk.dbscheduler.ui.model.TaskDetailsRequestParams;
import no.bekk.dbscheduler.ui.model.TaskRequestParams;
import no.bekk.dbscheduler.ui.model.TimelineModel;

public class TimelineLogic {

  private final TaskLogic taskLogic;
  private final LogLogic logLogic;

  public TimelineLogic(TaskLogic taskLogic, LogLogic logLogic) {
    this.taskLogic = taskLogic;
    this.logLogic = logLogic;
  }

  public TimelineModel getTimeline(Instant start, Instant end) {
    TaskDetailsRequestParams logParams = new TaskDetailsRequestParams(
        TaskRequestParams.TaskFilter.ALL,
        0, 1000, // Limit to 1000 for timeline view
        TaskRequestParams.TaskSort.DEFAULT,
        true,
        null, null, false, false,
        start, end,
        null, null, true, null);

    GetLogsResponse logsResponse = logLogic.getLogs(logParams);

    TaskRequestParams taskParams = new TaskRequestParams(
        TaskRequestParams.TaskFilter.ALL,
        0, 1000,
        TaskRequestParams.TaskSort.DEFAULT,
        true,
        null, null, false, false,
        start, end,
        true, null);

    GetTasksResponse tasksResponse = taskLogic.getAllTasksUngrouped(taskParams);

    return new TimelineModel(logsResponse.getItems(), tasksResponse.getItems());
  }
}

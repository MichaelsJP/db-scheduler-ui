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
package no.bekk.dbscheduler.ui.model;

import java.util.List;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MetricsModel {
  private double workerSaturation;
  private double throughput;
  private double queueBackpressure;
  private int successCount;
  private int failureCount;
  private List<MetricDataPoint> throughputHistory;
  private List<MetricDataPoint> successHistory;
  private List<MetricDataPoint> failureHistory;
  private List<MetricDataPoint> workerSaturationHistory;
  private List<MetricDataPoint> queueBackpressureHistory;
  private List<LogModel> recentLogs;
  private List<TaskModel> scheduledTasks;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MetricDataPoint {
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
    private Instant timestamp;
    private double value;
  }
}

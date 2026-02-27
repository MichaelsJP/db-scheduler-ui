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

import com.github.kagkarlsson.scheduler.Scheduler;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import no.bekk.dbscheduler.ui.model.MetricsModel;
import no.bekk.dbscheduler.ui.model.MetricsModel.MetricDataPoint;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public class MetricsLogic {

  private final Scheduler scheduler;
  private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;
  private final String logTableName;

  public MetricsLogic(Scheduler scheduler, DataSource dataSource, String logTableName) {
    this.scheduler = scheduler;
    this.namedParameterJdbcTemplate = new NamedParameterJdbcTemplate(dataSource);
    this.logTableName = logTableName;
  }

  public MetricsModel getMetrics(int durationMinutes) {
    int currentlyExecuting = scheduler.getCurrentlyExecuting().size();
    int threadpoolSize = scheduler.getThreadpoolSize();
    double workerSaturation = (double) currentlyExecuting / threadpoolSize;

    Instant startTime = Instant.now().minus(durationMinutes, ChronoUnit.MINUTES);
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("startTime", java.sql.Timestamp.from(startTime));
    
    Integer completedInWindow = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime",
        params,
        Integer.class);
    
    double throughput = completedInWindow != null ? (double) completedInWindow / (durationMinutes * 60.0) : 0.0;

    Integer scheduledTasks = namedParameterJdbcTemplate.getJdbcTemplate().queryForObject(
        "SELECT COUNT(*) FROM scheduled_tasks WHERE picked = FALSE",
        Integer.class);
    double queueBackpressure = scheduledTasks != null ? scheduledTasks.doubleValue() : 0.0;

    Integer successCount = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime AND succeeded = TRUE",
        params,
        Integer.class);
    
    Integer failureCount = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime AND succeeded = FALSE",
        params,
        Integer.class);

    // Generate historical data points (e.g., 20 points for the sparklines)
    List<MetricDataPoint> throughputHistory = getHistory(startTime, durationMinutes, null);
    List<MetricDataPoint> successHistory = getHistory(startTime, durationMinutes, true);
    List<MetricDataPoint> failureHistory = getHistory(startTime, durationMinutes, false);

    return new MetricsModel(
        workerSaturation,
        throughput,
        queueBackpressure,
        successCount != null ? successCount : 0,
        failureCount != null ? failureCount : 0,
        throughputHistory,
        successHistory,
        failureHistory
    );
  }

  private List<MetricDataPoint> getHistory(Instant startTime, int totalMinutes, Boolean succeeded) {
    int points = 20;
    int secondsPerBucket = (totalMinutes * 60) / points;
    List<MetricDataPoint> history = new ArrayList<>();
    
    for (int i = 0; i < points; i++) {
      Instant bucketStart = startTime.plus(i * secondsPerBucket, ChronoUnit.SECONDS);
      Instant bucketEnd = bucketStart.plus(secondsPerBucket, ChronoUnit.SECONDS);
      
      MapSqlParameterSource params = new MapSqlParameterSource()
          .addValue("bStart", java.sql.Timestamp.from(bucketStart))
          .addValue("bEnd", java.sql.Timestamp.from(bucketEnd));
      
      String query = "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :bStart AND time_finished < :bEnd";
      if (succeeded != null) {
        query += " AND succeeded = " + (succeeded ? "TRUE" : "FALSE");
      }
      
      Integer count = namedParameterJdbcTemplate.queryForObject(query, params, Integer.class);
      history.add(new MetricDataPoint(bucketEnd, count != null ? count.doubleValue() : 0.0));
    }
    return history;
  }
}

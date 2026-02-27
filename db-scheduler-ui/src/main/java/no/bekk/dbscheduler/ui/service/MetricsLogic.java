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
import no.bekk.dbscheduler.ui.model.TaskModel;
import no.bekk.dbscheduler.ui.model.LogModel;
import no.bekk.dbscheduler.ui.util.Caching;
import no.bekk.dbscheduler.ui.util.QueryUtils;
import no.bekk.dbscheduler.ui.util.mapper.TaskMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public class MetricsLogic {

  private final Scheduler scheduler;
  private final Caching caching;
  private final LogLogic logLogic;
  private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;
  private final String logTableName;
  private final String databaseProductName;

  public MetricsLogic(Scheduler scheduler, DataSource dataSource, String logTableName, Caching caching, LogLogic logLogic) {
    this.scheduler = scheduler;
    this.caching = caching;
    this.logLogic = logLogic;
    this.namedParameterJdbcTemplate = new NamedParameterJdbcTemplate(dataSource);
    this.logTableName = logTableName;
    try (java.sql.Connection connection = dataSource.getConnection()) {
      this.databaseProductName = connection.getMetaData().getDatabaseProductName();
    } catch (java.sql.SQLException e) {
      throw new RuntimeException("Failed to detect database product name", e);
    }
  }

  public MetricsModel getMetrics(int durationMinutes) {
    int currentlyExecuting = scheduler.getCurrentlyExecuting().size();
    int threadpoolSize = scheduler.getThreadpoolSize();
    double workerSaturation = (double) currentlyExecuting / threadpoolSize;

    Instant startTime = Instant.now().minus(durationMinutes, ChronoUnit.MINUTES);
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("startTime", java.sql.Timestamp.from(startTime));
    
    Long completedInWindow = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime",
        params,
        Long.class);
    
    double throughput = completedInWindow != null ? (double) completedInWindow / (durationMinutes * 60.0) : 0.0;

    Long readyToRun = namedParameterJdbcTemplate.getJdbcTemplate().queryForObject(
        "SELECT COUNT(*) FROM scheduled_tasks WHERE picked = FALSE AND execution_time <= NOW()",
        Long.class);
    double queueBackpressure = readyToRun != null ? readyToRun.doubleValue() : 0.0;

    Long successCount = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime AND " + getSucceededClause(true),
        params,
        Long.class);
    
    Long failureCount = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime AND " + getSucceededClause(false),
        params,
        Long.class);

    // Generate historical data points (e.g., 20 points for the sparklines)
    List<MetricDataPoint> throughputHistory = getHistory(startTime, durationMinutes, null, true);
    List<MetricDataPoint> successHistory = getHistory(startTime, durationMinutes, true, false);
    List<MetricDataPoint> failureHistory = getHistory(startTime, durationMinutes, false, false);
    
    // Real system metrics history reconstructed from logs
    List<MetricDataPoint> workerSaturationHistory = getSaturationHistory(startTime, durationMinutes, threadpoolSize);
    List<MetricDataPoint> queueBackpressureHistory = getBackpressureHistory(startTime, durationMinutes);

    // Fetch Task Stream data (fixed 10-minute window around now)
    Instant streamStart = Instant.now().minus(5, ChronoUnit.MINUTES);
    Instant streamEnd = Instant.now().plus(5, ChronoUnit.MINUTES);
    
    no.bekk.dbscheduler.ui.model.TaskDetailsRequestParams logParams = new no.bekk.dbscheduler.ui.model.TaskDetailsRequestParams(
        no.bekk.dbscheduler.ui.model.TaskRequestParams.TaskFilter.ALL,
        0, 100, no.bekk.dbscheduler.ui.model.TaskRequestParams.TaskSort.DEFAULT,
        true, null, null, false, false, streamStart, streamEnd, null, null, true, null);
    List<LogModel> recentLogs = logLogic.getLogsDirectlyFromDB(logParams);

    List<com.github.kagkarlsson.scheduler.ScheduledExecution<Object>> executions =
        caching.getExecutionsFromCacheOrDB(true, scheduler);
    List<TaskModel> scheduledTasks = TaskMapper.mapAllExecutionsToTaskModelUngrouped(executions).stream()
        .filter(t -> {
            if (t.getExecutionTime() == null || t.getExecutionTime().isEmpty()) return false;
            Instant time = t.getExecutionTime().get(0);
            return time.isAfter(streamStart) && time.isBefore(streamEnd);
        })
        .collect(java.util.stream.Collectors.toList());

    return new MetricsModel(
        workerSaturation,
        throughput,
        queueBackpressure,
        successCount != null ? successCount.intValue() : 0,
        failureCount != null ? failureCount.intValue() : 0,
        throughputHistory,
        successHistory,
        failureHistory,
        workerSaturationHistory,
        queueBackpressureHistory,
        recentLogs,
        scheduledTasks
    );
  }

  private List<MetricDataPoint> getSaturationHistory(Instant startTime, int totalMinutes, int threadpoolSize) {
    int points = 20;
    long secondsPerBucket = (totalMinutes * 60L) / points;
    List<MetricDataPoint> history = new ArrayList<>();
    
    for (int i = 0; i <= points; i++) {
      Instant bucketEnd = startTime.plus(i * secondsPerBucket, ChronoUnit.SECONDS);
      Instant bucketStart = bucketEnd.minus(secondsPerBucket, ChronoUnit.SECONDS);
      
      MapSqlParameterSource params = new MapSqlParameterSource()
          .addValue("bStart", java.sql.Timestamp.from(bucketStart))
          .addValue("bEnd", java.sql.Timestamp.from(bucketEnd));
      
      String query;
      Double busySeconds = 0.0;
      
      if (databaseProductName != null && databaseProductName.toLowerCase().contains("postgres")) {
          // Calculate average concurrency by summing overlaps of [time_started, time_finished] with [bucketStart, bucketEnd]
          query = "SELECT SUM(EXTRACT(EPOCH FROM (LEAST(time_finished, :bEnd) - GREATEST(time_started, :bStart)))) " +
                  "FROM " + logTableName + " " +
                  "WHERE time_started < :bEnd AND time_finished > :bStart";
          busySeconds = namedParameterJdbcTemplate.queryForObject(query, params, Double.class);
      } else {
          // Fallback: use count as a rough proxy if not Postgres
          query = "SELECT COUNT(*) FROM " + logTableName + " WHERE time_started < :bEnd AND time_finished > :bStart";
          Long count = namedParameterJdbcTemplate.queryForObject(query, params, Long.class);
          busySeconds = (count != null ? count.doubleValue() : 0.0) * (secondsPerBucket / 4.0); 
      }
      
      double avgSaturation = (busySeconds != null ? busySeconds : 0.0) / (secondsPerBucket * threadpoolSize);
      history.add(new MetricDataPoint(bucketEnd, Math.min(1.0, avgSaturation)));
    }
    return history;
  }

  private List<MetricDataPoint> getBackpressureHistory(Instant startTime, int totalMinutes) {
    int points = 20;
    long secondsPerBucket = (totalMinutes * 60L) / points;
    List<MetricDataPoint> history = new ArrayList<>();
    
    for (int i = 0; i <= points; i++) {
      Instant bucketEnd = startTime.plus(i * secondsPerBucket, ChronoUnit.SECONDS);
      Instant bucketStart = bucketEnd.minus(secondsPerBucket, ChronoUnit.SECONDS);
      
      MapSqlParameterSource params = new MapSqlParameterSource()
          .addValue("bStart", java.sql.Timestamp.from(bucketStart))
          .addValue("bEnd", java.sql.Timestamp.from(bucketEnd));
      
      String query;
      Double queuedSeconds = 0.0;
      
      if (databaseProductName != null && databaseProductName.toLowerCase().contains("postgres")) {
          // Calculate average queue depth by summing overlaps of [execution_time, time_started] with [bucketStart, bucketEnd]
          query = "SELECT SUM(EXTRACT(EPOCH FROM (LEAST(time_started, :bEnd) - GREATEST(execution_time, :bStart)))) " +
                  "FROM " + logTableName + " " +
                  "WHERE execution_time < :bEnd AND time_started > :bStart";
          queuedSeconds = namedParameterJdbcTemplate.queryForObject(query, params, Double.class);
      } else {
          query = "SELECT COUNT(*) FROM " + logTableName + " WHERE execution_time < :bEnd AND time_started > :bStart";
          Long count = namedParameterJdbcTemplate.queryForObject(query, params, Long.class);
          queuedSeconds = (count != null ? count.doubleValue() : 0.0) * (secondsPerBucket / 2.0);
      }
      
      double avgQueueDepth = (queuedSeconds != null ? queuedSeconds : 0.0) / secondsPerBucket;
      history.add(new MetricDataPoint(bucketEnd, avgQueueDepth));
    }
    return history;
  }

  private String getSucceededClause(boolean succeeded) {
    if (databaseProductName != null && databaseProductName.toLowerCase().contains("oracle")) {
      return succeeded ? "succeeded = 1" : "succeeded = 0";
    }
    return succeeded ? "succeeded = TRUE" : "succeeded = FALSE";
  }

  private List<MetricDataPoint> getHistory(Instant startTime, int totalMinutes, Boolean succeeded, boolean asRate) {
    int points = 20;
    int secondsPerBucket = (totalMinutes * 60) / points;
    List<MetricDataPoint> history = new ArrayList<>();
    
    // Lead-in point at startTime to ensure graph spans the whole width
    history.add(new MetricDataPoint(startTime, 0.0));

    for (int i = 0; i < points; i++) {
      Instant bucketStart = startTime.plus(i * secondsPerBucket, ChronoUnit.SECONDS);
      Instant bucketEnd = bucketStart.plus(secondsPerBucket, ChronoUnit.SECONDS);
      
      MapSqlParameterSource params = new MapSqlParameterSource()
          .addValue("bStart", java.sql.Timestamp.from(bucketStart))
          .addValue("bEnd", java.sql.Timestamp.from(bucketEnd));
      
      String query = "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :bStart AND time_finished < :bEnd";
      if (succeeded != null) {
        query += " AND " + getSucceededClause(succeeded);
      }
      
      Long count = namedParameterJdbcTemplate.queryForObject(query, params, Long.class);
      double val = count != null ? count.doubleValue() : 0.0;
      if (asRate) {
        val = val / secondsPerBucket;
      }
      history.add(new MetricDataPoint(bucketEnd, val));
    }
    return history;
  }
}

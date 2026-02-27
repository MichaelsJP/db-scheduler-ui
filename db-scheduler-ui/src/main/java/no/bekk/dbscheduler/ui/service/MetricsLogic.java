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
import javax.sql.DataSource;
import no.bekk.dbscheduler.ui.model.MetricsModel;
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

  public MetricsModel getMetrics() {
    int currentlyExecuting = scheduler.getCurrentlyExecuting().size();
    int threadpoolSize = scheduler.getThreadpoolSize();
    double workerSaturation = (double) currentlyExecuting / threadpoolSize;

    // Throughput last 1 minute
    Instant oneMinuteAgo = Instant.now().minus(1, ChronoUnit.MINUTES);
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("startTime", java.sql.Timestamp.from(oneMinuteAgo));
    
    Integer completedLastMinute = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime",
        params,
        Integer.class);
    
    double throughput = completedLastMinute != null ? (double) completedLastMinute / 60.0 : 0.0;

    // Queue Backpressure: just count scheduled tasks for now
    Integer scheduledTasks = namedParameterJdbcTemplate.getJdbcTemplate().queryForObject(
        "SELECT COUNT(*) FROM scheduled_tasks WHERE picked = FALSE",
        Integer.class);
    double queueBackpressure = scheduledTasks != null ? scheduledTasks.doubleValue() : 0.0;

    // Success/Failure last 1 hour
    Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
    params = new MapSqlParameterSource()
        .addValue("startTime", java.sql.Timestamp.from(oneHourAgo));
    
    Integer successCount = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime AND succeeded = TRUE",
        params,
        Integer.class);
    
    Integer failureCount = namedParameterJdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + logTableName + " WHERE time_finished >= :startTime AND succeeded = FALSE",
        params,
        Integer.class);

    return new MetricsModel(
        workerSaturation,
        throughput,
        queueBackpressure,
        successCount != null ? successCount : 0,
        failureCount != null ? failureCount : 0
    );
  }
}

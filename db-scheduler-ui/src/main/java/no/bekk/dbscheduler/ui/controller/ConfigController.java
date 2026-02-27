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
package no.bekk.dbscheduler.ui.controller;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import no.bekk.dbscheduler.ui.model.ConfigResponse;
import no.bekk.dbscheduler.ui.service.LogLogic;
import no.bekk.dbscheduler.ui.service.TaskLogic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin
@RequestMapping("/db-scheduler-api/config")
public class ConfigController {

  private final boolean showHistory;
  private final Supplier<Boolean> readOnly;
  private final TaskLogic taskLogic;
  private final LogLogic logLogic;

  public ConfigController(
      boolean showHistory,
      Supplier<Boolean> readOnly,
      TaskLogic taskLogic,
      @Autowired(required = false) LogLogic logLogic) {
    this.showHistory = showHistory;
    this.readOnly = readOnly;
    this.taskLogic = taskLogic;
    this.logLogic = logLogic;
  }

  @GetMapping
  public ConfigResponse getConfig() {
    return new ConfigResponse(showHistory, readOnly.get());
  }

  @GetMapping("/tags")
  public List<String> getTags() {
    Set<String> tags = new HashSet<>(taskLogic.getTags());
    if (logLogic != null) {
      tags.addAll(logLogic.getTags());
    }
    return tags.stream().sorted().collect(Collectors.toList());
  }
}

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
import { Metrics } from 'src/models/Metrics';
import { API_BASE_URL } from 'src/utils/config';

export const METRICS_QUERY_KEY = `metrics`;

export const getMetrics = async (durationMinutes: number = 60): Promise<Metrics> => {
  const response = await fetch(`${API_BASE_URL}/metrics?durationMinutes=${durationMinutes}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status == 401) {
    document.location.href = '/db-scheduler';
  } else if (!response.ok) {
    throw new Error(`Error fetching metrics. Status: ${response.statusText}`);
  }

  return await response.json();
};

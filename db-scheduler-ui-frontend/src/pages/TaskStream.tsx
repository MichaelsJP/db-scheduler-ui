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
import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, VStack, Tooltip, HStack } from '@chakra-ui/react';
import { Log } from 'src/models/Log';
import { Task } from 'src/models/Task';
import { scaleTime } from '@visx/scale';
import { ParentSize } from '@visx/responsive';

interface TaskStreamProps {
  logs: Log[];
  tasks: Task[];
  anchorTime?: number;
}

const STREAM_WINDOW_MS = 1000 * 60 * 10; // 10 minutes total view

// Simple stable hash for row assignment
const getRow = (name: string, height: number) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    const rowCount = Math.floor((height - 60) / 25);
    return (Math.abs(hash) % rowCount) * 25 + 30;
};

export const TaskStream: React.FC<TaskStreamProps> = ({ logs, tasks }) => {
  const [smoothNow, setSmoothNow] = useState(Date.now());
  const requestRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setSmoothNow(Date.now());
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  return (
    <VStack align="stretch" spacing={2} w="full">
      <Box position="relative" h="300px" bg="gray.50" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
        <ParentSize>
          {({ width, height }) => {
            if (width < 10) return null;
            
            const startMs = smoothNow - STREAM_WINDOW_MS / 2;
            const endMs = smoothNow + STREAM_WINDOW_MS / 2;

            const xScale = scaleTime({
              domain: [new Date(startMs), new Date(endMs)],
              range: [0, width],
            });

            return (
              <svg width={width} height={height}>
                {/* Background Grid */}
                {[...Array(11)].map((_, i) => {
                    const gridTime = new Date(Math.floor(startMs / 60000) * 60000 + i * 60000);
                    const x = xScale(gridTime);
                    if (x < 0 || x > width) return null;
                    return (
                        <g key={i}>
                            <line x1={x} x2={x} y1={0} y2={height} stroke="#E2E8F0" strokeWidth={1} />
                            <text x={x + 5} y={height - 10} fontSize="10px" fill="gray.400">
                                {gridTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </text>
                        </g>
                    );
                })}

                {/* NOW Line */}
                <line x1={width/2} x2={width/2} y1={0} y2={height} stroke="#F56565" strokeWidth={2} strokeDasharray="4 4" />
                <rect x={width/2 - 20} y={5} width={40} height={18} rx={4} fill="#F56565" />
                <text x={width/2} y={18} textAnchor="middle" fill="white" fontSize="10px" fontWeight="bold">NOW</text>

                {/* Past Logs */}
                {logs.map((log) => {
                  const s = new Date(log.timeStarted).getTime();
                  const f = new Date(log.timeFinished).getTime();
                  const x = xScale(new Date(s));
                  const pixelsPerMs = width / STREAM_WINDOW_MS;
                  const w = Math.max(8, (f - s) * pixelsPerMs);
                  const y = getRow(log.taskName, height);

                  return (
                    <Tooltip key={log.id} label={`${log.taskName} (${log.succeeded ? 'Success' : 'Failed'})`}>
                        <g>
                            <rect
                                x={x}
                                y={y}
                                width={w}
                                height={18}
                                fill={log.succeeded ? '#48BB78' : '#F56565'}
                                opacity={0.7}
                                rx={4}
                            />
                            {w > 40 && (
                                <text
                                    x={x + 5}
                                    y={y + 13}
                                    fontSize="10px"
                                    fill="white"
                                    fontWeight="bold"
                                    pointerEvents="none"
                                >
                                    {log.taskName}
                                </text>
                            )}
                        </g>
                    </Tooltip>
                  );
                })}

                {/* Future & Running Tasks */}
                {tasks.map((task, i) => {
                  const execTimes = Array.isArray(task.executionTime) ? task.executionTime : [task.executionTime];
                  const execTime = new Date(execTimes[0]);
                  if (isNaN(execTime.getTime())) return null;

                  const isRunning = Array.isArray(task.picked) ? task.picked[0] : task.picked;
                  const instId = Array.isArray(task.taskInstance) ? task.taskInstance[0] : task.taskInstance;
                  const y = getRow(task.taskName, height);
                  const startX = xScale(execTime);
                  
                  const x = startX;
                  let w = 12;

                  if (isRunning) {
                      // Stretching running task effect
                      w = Math.max(20, (width/2) - startX);
                  }

                  return (
                    <Tooltip key={`${task.taskName}-${instId || i}`} label={`${task.taskName} (${isRunning ? 'Running' : 'Scheduled'})`}>
                        <g>
                            <rect
                                x={x}
                                y={y}
                                width={isRunning ? w : 10}
                                height={18}
                                fill={isRunning ? '#ED8936' : '#4299E1'}
                                opacity={isRunning ? 0.9 : 0.6}
                                rx={isRunning ? 4 : 5}
                            />
                            {(isRunning || w > 40) && (
                                <text
                                    x={x + 5}
                                    y={y + 13}
                                    fontSize="10px"
                                    fill="white"
                                    fontWeight="bold"
                                    pointerEvents="none"
                                >
                                    {task.taskName}
                                </text>
                            )}
                        </g>
                    </Tooltip>
                  );
                })}
              </svg>
            );
          }}
        </ParentSize>
      </Box>
      <HStack spacing={4} justify="center">
          <HStack><Box w={3} h={3} bg="green.400" borderRadius="sm" /><Text fontSize="xs">Success</Text></HStack>
          <HStack><Box w={3} h={3} bg="red.400" borderRadius="sm" /><Text fontSize="xs">Failed</Text></HStack>
          <HStack><Box w={3} h={3} bg="orange.400" borderRadius="sm" /><Text fontSize="xs">Running</Text></HStack>
          <HStack><Box w={3} h={3} bg="blue.400" borderRadius="sm" /><Text fontSize="xs">Scheduled</Text></HStack>
      </HStack>
    </VStack>
  );
};

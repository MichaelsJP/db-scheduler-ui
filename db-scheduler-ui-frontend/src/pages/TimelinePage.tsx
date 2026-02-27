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
import { Box, Heading, VStack, Button, HStack, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getTimeline, TIMELINE_QUERY_KEY } from 'src/services/getTimeline';
import { Group } from '@visx/group';
import { AxisBottom } from '@visx/axis';
import { scaleTime } from '@visx/scale';
import { GridColumns } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { Timeline } from 'src/models/Timeline';
import { Log } from 'src/models/Log';
import { Task } from 'src/models/Task';

export interface TimelineChartProps {
  width: number;
  height: number;
  timeline: Timeline;
  now: Date;
  start: Date;
  end: Date;
}

interface TooltipData {
  name: string;
  id: string;
  status: 'succeeded' | 'failed' | 'running' | 'scheduled';
  time: string;
}

export const TimelineChart = ({ width, height, timeline, now, start, end }: TimelineChartProps) => {
  const margin = { top: 40, right: 40, bottom: 60, left: 40 };
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<TooltipData>();

  const xScale = useMemo(() => {
    return scaleTime({
      domain: [start, end],
      range: [margin.left, Math.max(margin.left + 1, width - margin.right)],
    });
  }, [start, end, width, margin.left, margin.right]);

  const handleHover = useCallback((event: React.MouseEvent, data: TooltipData, x: number, y: number) => {
    showTooltip({
      tooltipData: data,
      tooltipLeft: x,
      tooltipTop: y,
    });
  }, [showTooltip]);

  if (width < 10 || height < 10) return <Box>Invalid dimensions</Box>;

  const rowHeight = 25;
  const chartAreaHeight = Math.max(100, height - margin.top - margin.bottom);
  const maxRows = Math.floor(chartAreaHeight / rowHeight) || 1;

  if ((!timeline.past || timeline.past.length === 0) && (!timeline.future || timeline.future.length === 0)) {
    return (
      <Box p={10} textAlign="center" color="gray.500">
        No tasks or logs found in this time window.
      </Box>
    );
  }

  return (
    <Box position="relative" w="full" h="full">
      <svg width={width} height={height}>
        <GridColumns scale={xScale} width={width} height={chartAreaHeight} stroke="#f0f0f0" top={margin.top} />
        <Group top={margin.top}>
          {/* Past Logs */}
          {timeline.past?.map((log: Log, i: number) => {
            const s = new Date(log.timeStarted);
            const f = new Date(log.timeFinished);
            if (isNaN(s.getTime()) || isNaN(f.getTime())) return null;
            
            const xPos = xScale(s);
            const w = Math.max(8, xScale(f) - xPos);
            const yPos = (i % maxRows) * rowHeight;

            return (
              <rect
                key={`log-${log.id}`}
                x={xPos}
                y={yPos}
                width={w}
                height={20}
                fill={log.succeeded ? '#48BB78' : '#F56565'}
                opacity={0.8}
                rx={4}
                onMouseEnter={(e) => handleHover(e, {
                  name: log.taskName,
                  id: log.taskInstance,
                  status: log.succeeded ? 'succeeded' : 'failed',
                  time: `${s.toLocaleTimeString()} - ${f.toLocaleTimeString()}`
                }, xPos + w/2, yPos + margin.top)}
                onMouseLeave={hideTooltip}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
          
          {/* Current & Future Tasks */}
          {timeline.future?.map((task: Task, i: number) => {
            const execTimes = Array.isArray(task.executionTime) ? task.executionTime : [task.executionTime];
            const execTime = execTimes[0];
            if (!execTime) return null;
            const d = new Date(execTime);
            if (isNaN(d.getTime())) return null;

            const isRunning = Array.isArray(task.picked) ? task.picked[0] : task.picked;
            const xPos = xScale(isRunning ? now : d);
            const yPos = ((i + (timeline.past?.length || 0)) % maxRows) * rowHeight;
            const instId = Array.isArray(task.taskInstance) ? task.taskInstance[0] : task.taskInstance;

            return (
              <rect
                key={`task-${task.taskName}-${instId || i}`}
                x={isRunning ? xPos - 15 : xPos}
                y={yPos}
                width={isRunning ? 30 : 12}
                height={20}
                fill={isRunning ? '#ED8936' : '#4299E1'}
                opacity={isRunning ? 0.9 : 0.6}
                rx={4}
                onMouseEnter={(e) => handleHover(e, {
                  name: task.taskName,
                  id: String(instId),
                  status: isRunning ? 'running' : 'scheduled',
                  time: d.toLocaleTimeString()
                }, xPos, yPos + margin.top)}
                onMouseLeave={hideTooltip}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
          
          {/* "Now" Line */}
          <line
            x1={xScale(now)}
            x2={xScale(now)}
            y1={0}
            y2={chartAreaHeight}
            stroke="#E53E3E"
            strokeWidth={3}
            strokeDasharray="5 3"
            style={{ pointerEvents: 'none' }}
          />
        </Group>
        <AxisBottom
          top={height - margin.bottom}
          scale={xScale}
          numTicks={width > 500 ? 10 : 5}
          stroke="#718096"
          tickStroke="#718096"
          tickLabelProps={() => ({
            fill: '#4A5568',
            fontSize: 11,
            textAnchor: 'middle',
          })}
        />
      </svg>
      
      {tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: '#2D3748',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 1000,
          }}
        >
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold">{tooltipData.name}</Text>
            <Text fontSize="xs" opacity={0.8}>ID: {tooltipData.id}</Text>
            <Text fontSize="xs" color={
              tooltipData.status === 'succeeded' ? 'green.300' : 
              tooltipData.status === 'failed' ? 'red.300' : 
              tooltipData.status === 'running' ? 'orange.300' : 'blue.300'
            }>
              {tooltipData.status.toUpperCase()}
            </Text>
            <Text fontSize="xs">{tooltipData.time}</Text>
          </VStack>
        </TooltipWithBounds>
      )}
    </Box>
  );
};

export const TimelinePage: React.FC = () => {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Stabilize the domain by rounding to the nearest 10 seconds
  const stabilizedNow = useMemo(() => {
    const time = now.getTime();
    return new Date(Math.floor(time / 10000) * 10000);
  }, [now]);

  const [viewWindow] = useState({
    startOffset: -1000 * 60 * 30, // 30m ago
    endOffset: 1000 * 60 * 30,    // 30m future
  });

  const start = useMemo(() => new Date(stabilizedNow.getTime() + viewWindow.startOffset), [stabilizedNow, viewWindow.startOffset]);
  const end = useMemo(() => new Date(stabilizedNow.getTime() + viewWindow.endOffset), [stabilizedNow, viewWindow.endOffset]);

  const { data: timeline } = useQuery(
    [TIMELINE_QUERY_KEY, start.toISOString(), end.toISOString()],
    () => getTimeline(start, end),
    { 
      refetchInterval: 5000,
      keepPreviousData: true 
    }
  );

  return (
    <VStack align="stretch" spacing={8} h="full" w="full">
      <HStack justify="space-between" px={4}>
        <Heading size="lg">Timeline</Heading>
        <Button onClick={() => {}} colorScheme="blue" size="sm">Snap to Now</Button>
      </HStack>
      <Box flex={1} bg="white" shadow="md" borderRadius="xl" position="relative" overflow="hidden" minH="500px">
        {timeline ? (
          <ParentSize debounceTime={50}>
            {({ width, height }) => (
              width > 0 && height > 0 ? (
                <TimelineChart 
                  width={width} 
                  height={height} 
                  timeline={timeline} 
                  now={now} 
                  start={start} 
                  end={end} 
                />
              ) : null
            )}
          </ParentSize>
        ) : (
          <Box p={10}>Loading timeline...</Box>
        )}
      </Box>
    </VStack>
  );
};

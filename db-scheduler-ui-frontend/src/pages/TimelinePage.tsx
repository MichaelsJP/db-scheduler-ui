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
import { Box, Heading, VStack, useDimensions, Button, HStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { getTimeline, TIMELINE_QUERY_KEY } from 'src/services/getTimeline';
import { Group } from '@visx/group';
import { AxisBottom } from '@visx/axis';
import { scaleTime } from '@visx/scale';
import { GridColumns } from '@visx/grid';
import { motion } from 'framer-motion';

export const TimelinePage: React.FC = () => {
  const containerRef = useRef(null);
  const dimensions = useDimensions(containerRef);
  
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [viewWindow, setViewWindow] = useState({
    startOffset: -1000 * 60 * 30, // 30m ago
    endOffset: 1000 * 60 * 30,    // 30m future
  });

  const start = useMemo(() => new Date(now.getTime() + viewWindow.startOffset), [now, viewWindow.startOffset]);
  const end = useMemo(() => new Date(now.getTime() + viewWindow.endOffset), [now, viewWindow.endOffset]);

  const { data: timeline, isLoading } = useQuery(
    [TIMELINE_QUERY_KEY, start.toISOString(), end.toISOString()],
    () => getTimeline(start, end),
    { refetchInterval: 5000 }
  );

  const width = dimensions?.borderBox.width ?? 800;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 40 };

  const xScale = useMemo(() => scaleTime({
    domain: [start, end],
    range: [margin.left, width - margin.right],
  }), [start, end, width, margin.left, margin.right]);

  const snapToNow = () => {
    setViewWindow({
      startOffset: -1000 * 60 * 30,
      endOffset: 1000 * 60 * 30,
    });
  };

  if (isLoading || !timeline) {
    return <Box>Loading timeline...</Box>;
  }

  return (
    <VStack align="stretch" spacing={8} ref={containerRef}>
      <HStack justify="space-between">
        <Heading size="lg">Timeline View</Heading>
        <Button onClick={snapToNow} colorScheme="blue" size="sm">Snap to Now</Button>
      </HStack>
      <Box h={height} bg="white" shadow="md" borderRadius="xl" position="relative" overflow="hidden">
        <svg width={width} height={height}>
          <GridColumns scale={xScale} width={width} height={height - margin.bottom} stroke="#f0f0f0" />
          <Group top={margin.top}>
            {/* Past Logs */}
            {timeline.past.map((log, i) => (
              <motion.rect
                key={`log-${log.id}`}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 0.8,
                  x: xScale(new Date(log.timeStarted)),
                  width: Math.max(5, xScale(new Date(log.timeFinished)) - xScale(new Date(log.timeStarted)))
                }}
                y={i * 25 % (height - margin.bottom - margin.top)}
                height={20}
                fill={log.succeeded ? '#48BB78' : '#F56565'}
                rx={4}
              />
            ))}
            {/* Future Tasks */}
            {timeline.future.map((task, i) => (
              <motion.rect
                key={`task-${task.taskName}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 0.6,
                  x: xScale(new Date(task.executionTime[0]))
                }}
                y={(i * 25 + 200) % (height - margin.bottom - margin.top)}
                width={12}
                height={20}
                fill="#4299E1"
                rx={4}
              />
            ))}
            {/* "Now" Line */}
            <motion.line
              animate={{ x1: xScale(now), x2: xScale(now) }}
              y1={-margin.top}
              y2={height - margin.bottom}
              stroke="#E53E3E"
              strokeWidth={3}
              strokeDasharray="5 3"
            />
            <motion.text
              animate={{ x: xScale(now) + 5 }}
              y={-10}
              fontSize="xs"
              fontWeight="bold"
              fill="#E53E3E"
            >
              NOW
            </motion.text>
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
      </Box>
    </VStack>
  );
};

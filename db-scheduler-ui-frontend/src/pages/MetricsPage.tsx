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
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  HStack,
  Select,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo } from 'react';
import { getMetrics, METRICS_QUERY_KEY } from 'src/services/getMetrics';
import { getTimeline, TIMELINE_QUERY_KEY } from 'src/services/getTimeline';
import { TimelineChart } from 'src/pages/TimelinePage';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { ParentSize } from '@visx/responsive';
import { MetricDataPoint } from 'src/models/Metrics';
import colors from 'src/styles/colors';

const Sparkline = ({ data, width, height, color }: { data: MetricDataPoint[], width: number, height: number, color: string }) => {
  if (!data || data.length === 0) return null;

  const timestamps = data.map(d => new Date(d.timestamp).getTime());
  const values = data.map(d => d.value);

  const xScale = scaleTime({
    domain: [Math.min(...timestamps), Math.max(...timestamps)],
    range: [0, width],
  });

  const yScale = scaleLinear({
    domain: [0, Math.max(...values) * 1.1 || 1],
    range: [height, 0],
  });

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <LinePath
        data={data}
        x={d => xScale(new Date(d.timestamp)) ?? 0}
        y={d => yScale(d.value) ?? 0}
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.5}
        curve={curveMonotoneX}
      />
    </svg>
  );
};

const MetricCard = ({ label, value, helpText, history, color }: { label: string, value: string, helpText: string, history?: MetricDataPoint[], color: string }) => (
  <Stat
    p={5}
    shadow="md"
    border="1px solid"
    borderColor={colors.primary['300']}
    borderRadius="xl"
    bg="white"
    position="relative"
    overflow="hidden"
    minH="120px"
  >
    <StatLabel fontWeight="bold" color="gray.600">{label}</StatLabel>
    <StatNumber fontSize="3xl" color={colors.dbBlue} zIndex={1} position="relative">{value}</StatNumber>
    <StatHelpText zIndex={1} position="relative">{helpText}</StatHelpText>
    {history && (
      <Box position="absolute" bottom={0} left={0} right={0} height="60px" pointerEvents="none">
        <Sparkline data={history} width={400} height={60} color={color} />
      </Box>
    )}
  </Stat>
);

export const MetricsPage: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState(60); // minutes
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const stabilizedNow = useMemo(() => {
    const time = now.getTime();
    return new Date(Math.floor(time / 10000) * 10000);
  }, [now]);

  const start = useMemo(() => new Date(stabilizedNow.getTime() - 1000 * 60 * 30), [stabilizedNow]);
  const end = useMemo(() => new Date(stabilizedNow.getTime() + 1000 * 60 * 30), [stabilizedNow]);

  const { data: metrics, isLoading: metricsLoading } = useQuery([METRICS_QUERY_KEY, timeWindow], () => getMetrics(timeWindow), {
    refetchInterval: 10000,
    keepPreviousData: true,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery(
    [TIMELINE_QUERY_KEY, start.toISOString(), end.toISOString()],
    () => getTimeline(start, end),
    { 
      refetchInterval: 5000,
      keepPreviousData: true 
    }
  );

  if ((metricsLoading && !metrics) || (timelineLoading && !timeline)) {
    return <Box p={10}>Loading overview...</Box>;
  }

  return (
    <VStack align="stretch" spacing={8} pb={10}>
      <HStack justify="space-between">
        <Heading size="lg">Overview</Heading>
        <HStack>
          <Text fontSize="sm" fontWeight="bold">Time Window:</Text>
          <Select 
            size="sm" 
            w="180px" 
            value={timeWindow} 
            onChange={(e) => setTimeWindow(parseInt(e.target.value))}
            bg="white"
            borderRadius="md"
          >
            <option value={15}>Last 15 minutes</option>
            <option value={60}>Last 1 hour</option>
            <option value={360}>Last 6 hours</option>
            <option value={1440}>Last 24 hours</option>
          </Select>
        </HStack>
      </HStack>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
        <MetricCard
          label="Throughput"
          value={metrics ? `${metrics.throughput.toFixed(2)}/s` : '0.00/s'}
          helpText="Avg executions / sec"
          history={metrics?.throughputHistory}
          color="blue.300"
        />
        <MetricCard
          label="Successes"
          value={metrics ? metrics.successCount.toString() : '0'}
          helpText={`Total successful in window`}
          history={metrics?.successHistory}
          color="green.300"
        />
        <MetricCard
          label="Failures"
          value={metrics ? metrics.failureCount.toString() : '0'}
          helpText={`Total failed in window`}
          history={metrics?.failureHistory}
          color="red.300"
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
        <MetricCard
          label="Worker Saturation"
          value={metrics ? `${(metrics.workerSaturation * 100).toFixed(1)}%` : '0%'}
          helpText="Current threadpool usage"
          color="purple.300"
        />
        <MetricCard
          label="Queue Backpressure"
          value={metrics ? metrics.queueBackpressure.toString() : '0'}
          helpText="Currently enqueued tasks"
          color="orange.300"
        />
      </SimpleGrid>

      <Box pt={4}>
        <Heading size="md" mb={4}>Live Timeline</Heading>
        <Box bg="white" shadow="md" borderRadius="xl" position="relative" overflow="hidden" minH="400px">
          {timeline ? (
            <ParentSize>
              {({ width, height }) => (
                <TimelineChart 
                  width={width} 
                  height={height} 
                  timeline={timeline} 
                  now={now} 
                  start={start} 
                  end={end} 
                />
              )}
            </ParentSize>
          ) : (
            <Box p={10}>Loading timeline...</Box>
          )}
        </Box>
      </Box>
    </VStack>
  );
};

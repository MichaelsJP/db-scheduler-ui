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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMetrics, METRICS_QUERY_KEY } from 'src/services/getMetrics';
import { LinePath, Bar } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import { MetricDataPoint } from 'src/models/Metrics';
import colors from 'src/styles/colors';
import { RefreshButton } from 'src/components/input/RefreshButton';
import { TaskStream } from './TaskStream';
import { useRefresh } from 'src/context/RefreshContext';
import { motion } from 'framer-motion';

const bisectDate = bisector<MetricDataPoint, Date>(d => new Date(d.timestamp)).left;

const Sparkline = React.memo(({ data, width, height, color, minX, maxX }: { data: MetricDataPoint[], width: number, height: number, color: string, minX: number, maxX: number }) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<MetricDataPoint>();

  const values = useMemo(() => data?.map(d => d.value) || [], [data]);
  // STABILIZATION: Use the actual data timestamps for the domain
  const actualMaxX = useMemo(() => {
      if (!data || data.length === 0) return maxX;
      return Math.max(...data.map(d => new Date(d.timestamp).getTime()));
  }, [data, maxX]);

  const xScale = useMemo(() => scaleTime({
    domain: [minX, actualMaxX],
    range: [0, width],
  }), [minX, actualMaxX, width]);

  const yScale = useMemo(() => scaleLinear({
    domain: [0, Math.max(...values) * 1.1 || 1],
    range: [height, 0],
  }), [values, height]);

  const handleTooltip = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!data || data.length === 0) return;
      const point = localPoint(event);
      if (!point) return;
      const { x } = point;
      const x0 = xScale.invert(x);
      const index = bisectDate(data, x0, 1);
      const d0 = data[index - 1];
      const d1 = data[index];
      let d = d0;
      if (d1 && d1.timestamp) {
        d = x0.getTime() - new Date(d0.timestamp).getTime() > new Date(d1.timestamp).getTime() - x0.getTime() ? d1 : d0;
      }
      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(new Date(d.timestamp)),
        tooltipTop: yScale(d.value),
      });
    },
    [showTooltip, xScale, yScale, data]
  );

  if (!data || data.length === 0) return null;

  return (
    <Box position="relative">
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <svg width={width} height={height} style={{ overflow: 'hidden' }}>
          <LinePath
            data={data}
            x={d => xScale(new Date(d.timestamp)) ?? 0}
            y={d => yScale(d.value) ?? 0}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.5}
            curve={curveMonotoneX}
          />
          <Bar
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
          {tooltipData && (
            <g>
              <circle
                cx={tooltipLeft}
                cy={tooltipTop}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            </g>
          )}
        </svg>
      </motion.div>
      {tooltipData && (
        <TooltipWithBounds
          key={`tooltip-${tooltipData.timestamp}-${tooltipData.value}`}
          top={tooltipTop - 10}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: color,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '4px 8px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
            border: '2px solid white',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltipData.value % 1 === 0 ? tooltipData.value : tooltipData.value.toFixed(2)}
        </TooltipWithBounds>
      )}
    </Box>
  );
});

const MetricCard = ({ label, value, helpText, history, color, minX, maxX }: { label: string, value: string, helpText: string, history?: MetricDataPoint[], color: string, minX?: number, maxX?: number }) => (
  <Stat
    p={5}
    shadow="md"
    border="1px solid"
    borderColor={colors.primary['300']}
    borderRadius="xl"
    bg="white"
    position="relative"
    overflow="hidden"
    minH="150px"
  >
    <StatLabel fontWeight="bold" color="gray.600" zIndex={2} position="relative" pointerEvents="none">{label}</StatLabel>
    <StatNumber fontSize="3xl" color={colors.dbBlue} zIndex={2} position="relative" pointerEvents="none">{value}</StatNumber>
    <StatHelpText zIndex={2} position="relative" pointerEvents="none">{helpText}</StatHelpText>
    {history && minX !== undefined && maxX !== undefined && (
      <Box position="absolute" bottom={0} left={-1} right={-1} height="80px" zIndex={1}>
        <ParentSize>
          {({ width, height }) => (
            <Sparkline 
              data={history} 
              width={width + 2} // Compensation for negative margins
              height={height} 
              color={color} 
              minX={minX} 
              maxX={maxX} 
            />
          )}
        </ParentSize>
      </Box>
    )}
  </Stat>
);

export const MetricsPage: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState(10); // minutes
  const { lastRefresh } = useRefresh();
  const queryClient = useQueryClient();
  
  // Synchronize with global refresh events
  useEffect(() => {
    const handleGlobalRefresh = () => {
      queryClient.invalidateQueries([METRICS_QUERY_KEY]);
    };
    window.addEventListener('db-scheduler-ui-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('db-scheduler-ui-refresh', handleGlobalRefresh);
  }, [queryClient]);

  // Domain for metrics sparklines (always last durationMinutes)
  const metricsMinX = useMemo(() => lastRefresh - 1000 * 60 * timeWindow, [lastRefresh, timeWindow]);
  const metricsMaxX = useMemo(() => lastRefresh, [lastRefresh]);


  const { data: metrics, isLoading: metricsLoading } = useQuery([METRICS_QUERY_KEY, timeWindow], () => getMetrics(timeWindow), {
    refetchInterval: false,
    keepPreviousData: true,
  });

  return (
    <VStack align="stretch" spacing={8} pb={10}>
      <HStack justify="space-between" wrap="wrap" gap={4}>
        <Heading size="lg">Overview</Heading>
        <HStack spacing={4}>
          <HStack>
            <Text fontSize="sm" fontWeight="bold" whiteSpace="nowrap">Time Window:</Text>
            <Select 
              size="sm" 
              w="150px" 
              value={timeWindow} 
              onChange={(e) => setTimeWindow(parseInt(e.target.value))}
              bg="white"
              borderRadius="md"
            >
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </Select>
          </HStack>
          <RefreshButton />
        </HStack>
      </HStack>
      
      {metricsLoading && !metrics ? (
        <Box p={10}>Loading metrics...</Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
          <MetricCard
            key="throughput"
            label="Throughput"
            value={metrics ? `${metrics.throughput.toFixed(2)}/s` : '0.00/s'}
            helpText="Avg executions / sec"
            history={metrics?.throughputHistory}
            color={colors.running['300']}
            minX={metricsMinX}
            maxX={metricsMaxX}
          />
          <MetricCard
            key="successes"
            label="Successes"
            value={metrics ? metrics.successCount.toString() : '0'}
            helpText={`Total successful in window`}
            history={metrics?.successHistory}
            color={colors.success['100']}
            minX={metricsMinX}
            maxX={metricsMaxX}
          />
          <MetricCard
            key="failures"
            label="Failures"
            value={metrics ? metrics.failureCount.toString() : '0'}
            helpText={`Total failed in window`}
            history={metrics?.failureHistory}
            color={colors.failed['200']}
            minX={metricsMinX}
            maxX={metricsMaxX}
          />
          <MetricCard
            key="saturation"
            label="Worker Saturation"
            value={metrics ? `${(metrics.workerSaturation * 100).toFixed(1)}%` : '0%'}
            helpText="Current threadpool usage"
            history={metrics?.workerSaturationHistory}
            color="#805AD5"
            minX={metricsMinX}
            maxX={metricsMaxX}
          />
          <MetricCard
            key="backpressure"
            label="Queue Backpressure"
            value={metrics ? metrics.queueBackpressure.toString() : '0'}
            helpText="Currently enqueued tasks"
            history={metrics?.queueBackpressureHistory}
            color="#DD6B20"
            minX={metricsMinX}
            maxX={metricsMaxX}
          />
        </SimpleGrid>
      )}

      <Box pt={4}>
        <Heading size="md" mb={4}>Task Stream</Heading>
        {metrics ? (
          <TaskStream 
            logs={metrics.recentLogs || []} 
            tasks={metrics.scheduledTasks || []} 
            anchorTime={lastRefresh}
          />
        ) : (
          <Box p={10} bg="white" shadow="md" borderRadius="xl">Loading stream...</Box>
        )}
      </Box>
    </VStack>
  );
};

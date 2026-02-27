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
  IconButton,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMetrics, METRICS_QUERY_KEY } from 'src/services/getMetrics';
import { getTimeline, TIMELINE_QUERY_KEY } from 'src/services/getTimeline';
import { TimelineChart } from 'src/pages/TimelinePage';
import { LinePath, Bar } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import { MetricDataPoint } from 'src/models/Metrics';
import colors from 'src/styles/colors';

const bisectDate = bisector<MetricDataPoint, Date>(d => new Date(d.timestamp)).left;

const Sparkline = ({ data, width, height, color }: { data: MetricDataPoint[], width: number, height: number, color: string }) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<MetricDataPoint>();

  const timestamps = useMemo(() => data?.map(d => new Date(d.timestamp).getTime()) || [], [data]);
  const values = useMemo(() => data?.map(d => d.value) || [], [data]);

  const xScale = useMemo(() => scaleTime({
    domain: [Math.min(...timestamps), Math.max(...timestamps)],
    range: [0, width],
  }), [timestamps, width]);

  const yScale = useMemo(() => scaleLinear({
    domain: [0, Math.max(...values) * 1.1 || 1],
    range: [height, 0],
  }), [values, height]);

  const handleTooltip = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!data || data.length === 0) return;
      const { x } = localPoint(event) || { x: 0 };
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
      {tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: color,
            color: 'white',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            transform: 'translate(-50%, -120%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
        >
          {tooltipData.value.toFixed(2)}
        </TooltipWithBounds>
      )}
    </Box>
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
    minH="150px"
  >
    <StatLabel fontWeight="bold" color="gray.600">{label}</StatLabel>
    <StatNumber fontSize="3xl" color={colors.dbBlue} zIndex={2} position="relative">{value}</StatNumber>
    <StatHelpText zIndex={2} position="relative">{helpText}</StatHelpText>
    {history && (
      <Box position="absolute" bottom={0} left={0} right={0} height="80px" zIndex={1}>
        <ParentSize>
          {({ width, height }) => (
            <Sparkline data={history} width={width} height={height} color={color} />
          )}
        </ParentSize>
      </Box>
    )}
  </Stat>
);

export const MetricsPage: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState(60); // minutes
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds
  const [countdown, setCountdown] = useState(refreshInterval);
  const [now, setNow] = useState(new Date());
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries([METRICS_QUERY_KEY]);
    queryClient.invalidateQueries([TIMELINE_QUERY_KEY]);
    if (refreshInterval !== 0) {
      setCountdown(refreshInterval);
    }
  }, [queryClient, refreshInterval]);

  useEffect(() => {
    if (refreshInterval === 0) {
      setCountdown(0);
      return;
    }
    
    setCountdown(refreshInterval);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleManualRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [refreshInterval, handleManualRefresh]);

  const stabilizedNow = useMemo(() => {
    const time = now.getTime();
    return new Date(Math.floor(time / 10000) * 10000);
  }, [now]);

  const start = useMemo(() => new Date(stabilizedNow.getTime() - 1000 * 60 * 30), [stabilizedNow]);
  const end = useMemo(() => new Date(stabilizedNow.getTime() + 1000 * 60 * 30), [stabilizedNow]);

  const { data: metrics, isLoading: metricsLoading } = useQuery([METRICS_QUERY_KEY, timeWindow], () => getMetrics(timeWindow), {
    refetchInterval: false, // Handled by our countdown useEffect
    keepPreviousData: true,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery(
    [TIMELINE_QUERY_KEY, start.toISOString(), end.toISOString()],
    () => getTimeline(start, end),
    { 
      refetchInterval: refreshInterval === 0 ? false : Math.min(refreshInterval, 5) * 1000,
      keepPreviousData: true 
    }
  );

  if ((metricsLoading && !metrics) || (timelineLoading && !timeline)) {
    return <Box p={10}>Loading overview...</Box>;
  }

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
              <option value={15}>15 minutes</option>
              <option value={60}>1 hour</option>
              <option value={360}>6 hours</option>
              <option value={1440}>24 hours</option>
            </Select>
          </HStack>
          
          <HStack>
            <Text fontSize="sm" fontWeight="bold" whiteSpace="nowrap">Refresh:</Text>
            <Select 
              size="sm" 
              w="120px" 
              value={refreshInterval} 
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              bg="white"
              borderRadius="md"
            >
              <option value={0}>Off</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
            </Select>
            <Box position="relative">
              <IconButton
                aria-label="Refresh manually"
                icon={<RepeatIcon />}
                size="sm"
                onClick={handleManualRefresh}
                variant="outline"
                bg="white"
              />
              {refreshInterval > 0 && (
                <Text 
                  position="absolute" 
                  top="-2" 
                  right="-2" 
                  bg="blue.500" 
                  color="white" 
                  fontSize="xs" 
                  borderRadius="full" 
                  w="18px" 
                  h="18px" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {countdown}
                </Text>
              )}
            </Box>
          </HStack>
        </HStack>
      </HStack>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
        <MetricCard
          label="Throughput"
          value={metrics ? `${metrics.throughput.toFixed(2)}/s` : '0.00/s'}
          helpText="Avg executions / sec"
          history={metrics?.throughputHistory}
          color={colors.running['300']}
        />
        <MetricCard
          label="Successes"
          value={metrics ? metrics.successCount.toString() : '0'}
          helpText={`Total successful in window`}
          history={metrics?.successHistory}
          color={colors.success['100']}
        />
        <MetricCard
          label="Failures"
          value={metrics ? metrics.failureCount.toString() : '0'}
          helpText={`Total failed in window`}
          history={metrics?.failureHistory}
          color={colors.failed['200']}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
        <MetricCard
          label="Worker Saturation"
          value={metrics ? `${(metrics.workerSaturation * 100).toFixed(1)}%` : '0%'}
          helpText="Current threadpool usage"
          color="#805AD5"
        />
        <MetricCard
          label="Queue Backpressure"
          value={metrics ? metrics.queueBackpressure.toString() : '0'}
          helpText="Currently enqueued tasks"
          color="#DD6B20"
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

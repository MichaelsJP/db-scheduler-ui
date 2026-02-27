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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Heading,
  VStack,
  CircularProgress,
  StatGroup,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { getMetrics, METRICS_QUERY_KEY } from 'src/services/getMetrics';

export const MetricsPage: React.FC = () => {
  const { data: metrics, isLoading } = useQuery([METRICS_QUERY_KEY], getMetrics);

  if (isLoading || !metrics) {
    return <Box>Loading metrics...</Box>;
  }

  return (
    <VStack align="stretch" spacing={8}>
      <Heading size="lg">Metrics Dashboard</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
          <Stat>
            <StatLabel>Throughput</StatLabel>
            <StatNumber>{metrics.throughput.toFixed(2)}</StatNumber>
            <StatHelpText>Jobs / second (last 1m)</StatHelpText>
          </Stat>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
          <Stat>
            <StatLabel>Worker Saturation</StatLabel>
            <StatNumber>{(metrics.workerSaturation * 100).toFixed(1)}%</StatNumber>
            <CircularProgress 
              value={metrics.workerSaturation * 100} 
              color={metrics.workerSaturation > 0.8 ? 'red.400' : 'blue.400'} 
              size="60px"
              mt={2}
            />
          </Stat>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
          <Stat>
            <StatLabel>Queue Backpressure</StatLabel>
            <StatNumber>{metrics.queueBackpressure}</StatNumber>
            <StatHelpText>Enqueued tasks</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
        <Heading size="md" mb={4}>Health Check (Last 1h)</Heading>
        <StatGroup>
          <Stat>
            <StatLabel>Successful</StatLabel>
            <StatNumber color="green.500">{metrics.successCount}</StatNumber>
          </Stat>

          <Stat>
            <StatLabel>Failed</StatLabel>
            <StatNumber color="red.500">{metrics.failureCount}</StatNumber>
            {metrics.failureCount > 0 && (
              <StatHelpText>
                <StatArrow type="increase" />
                Needs attention
              </StatHelpText>
            )}
          </Stat>
        </StatGroup>
      </Box>
    </VStack>
  );
};

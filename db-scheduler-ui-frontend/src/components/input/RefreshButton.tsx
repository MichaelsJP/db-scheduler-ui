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
import { Box, IconButton, Text, HStack, Select } from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import React, { useState, useEffect } from 'react';
import colors from 'src/styles/colors';
import {
  InfiniteData,
  QueryObserverResult,
  useQuery,
} from '@tanstack/react-query';
import { TaskDetailsRequestParams } from 'src/models/TaskRequestParams';
import { InfiniteScrollResponse } from 'src/models/TasksResponse';
import { RefreshCircle } from 'src/components/common/RefreshCircle';
import { Log } from 'src/models/Log';
import { Task } from 'src/models/Task';
import { PollResponse } from 'src/models/PollResponse';
import { useRefresh } from 'src/context/RefreshContext';

interface RefreshButtonProps {
  refetch?: () => Promise<
    QueryObserverResult<InfiniteData<InfiniteScrollResponse<Task | Log>>> | unknown
  >;
  pollFunction?: (params: TaskDetailsRequestParams) => Promise<PollResponse>;
  pollKey?: string;
  params?: TaskDetailsRequestParams;
  onRefresh?: () => void;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  refetch,
  pollFunction,
  pollKey,
  params,
  onRefresh,
}) => {
  const { refreshInterval, setRefreshInterval, countdown, triggerManualRefresh, lastRefresh } = useRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize internal refetch with global refresh events
  useEffect(() => {
    const handleGlobalRefresh = async () => {
      setIsRefreshing(true);
      if (onRefresh) onRefresh();
      if (refetch) await refetch();
      // Shorter spin for real-time mode
      setTimeout(() => setIsRefreshing(false), refreshInterval === 1 ? 400 : 800);
    };

    window.addEventListener('db-scheduler-ui-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('db-scheduler-ui-refresh', handleGlobalRefresh);
  }, [refetch, onRefresh]);

  const handleManualClick = () => {
    triggerManualRefresh();
  };

  const getIcon = () => {
    if (refreshInterval === 1 || refreshInterval === 0 || isRefreshing) {
      return <RepeatIcon />;
    }
    return <Text fontSize="xs" fontWeight="bold">{countdown}</Text>;
  };

  const isSpinning = refreshInterval === 1 || isRefreshing;

  const { data } = useQuery(
    pollKey && params ? [
      pollKey,
      params.filter,
      params.sorting,
      params.asc,
      params.startTime,
      params.endTime,
      params.taskName,
      params.taskId,
      params.searchTermTaskName,
      params.searchTermTaskInstance,
      params.taskInstanceExactMatch,
      params.taskNameExactMatch,
      lastRefresh, // Include lastRefresh to trigger poll update
    ] : [],
    () => pollFunction && params ?
      pollFunction({
        filter: params.filter,
        sorting: params.sorting,
        asc: params.asc,
        startTime: params.startTime,
        endTime: params.endTime,
        taskName: params.taskName,
        taskId: params.taskId,
        searchTermTaskName: params.searchTermTaskName,
        searchTermTaskInstance: params.searchTermTaskInstance,
        taskInstanceExactMatch: params.taskInstanceExactMatch,
        taskNameExactMatch: params.taskNameExactMatch,
      }) : Promise.resolve(null),
    { enabled: !!pollKey && !!params }
  );

  return (
    <HStack spacing={3}>
      <HStack>
        <Text fontSize="sm" fontWeight="bold" whiteSpace="nowrap">Refresh:</Text>
        <Select 
          size="sm" 
          w="100px" 
          value={refreshInterval} 
          onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
          bg="white"
          borderRadius="md"
        >
          <option value={0}>Off</option>
          <option value={1}>1s (Real-time)</option>
          <option value={5}>5s</option>
          <option value={10}>10s</option>
          <option value={30}>30s</option>
          <option value={60}>1m</option>
        </Select>
      </HStack>
      <Box position="relative" display="inline-block">
        <IconButton
          aria-label="Refresh manually"
          icon={getIcon()}
          size="sm"
          onClick={handleManualClick}
          variant="outline"
          bg="white"
          isDisabled={isRefreshing && refreshInterval !== 1}
          className={isSpinning ? "spin-animation" : ""}
          _hover={{ bg: "gray.50" }}
          w="36px"
          h="36px"
        />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-animation svg {
            animation: spin 2s linear infinite;
          }
        `}</style>
        <Box
          pos="absolute"
          left={-6}
          justifyContent={'flex-end'}
          top={-1}
          display="flex"
          flexDirection="column"
          pointerEvents="none"
        >
          <RefreshCircle
            number={data?.newFailures ?? 0}
            color={colors.failed['200']}
            visible={data?.newFailures !== 0 && data?.newFailures !== undefined}
            hoverText=" failed since refresh"
          />
          {data?.newSucceeded ? (
            <RefreshCircle
              number={data?.newSucceeded ?? 0}
              color={colors.success['200']}
              visible={
                data?.newSucceeded !== 0 && data?.newSucceeded !== undefined
              }
              hoverText=" succeeded since refresh"
            />
          ) : (
            <RefreshCircle
              number={data?.newRunning ?? 0}
              color={colors.running['300']}
              visible={data?.newRunning !== 0 && data?.newRunning !== undefined}
              hoverText=" running since refresh"
            />
          )}

          <RefreshCircle
            number={data?.newTasks ?? 0}
            color={colors.primary['300']}
            textColor={colors.primary['900']}
            visible={data?.newTasks !== 0 && data?.newTasks !== undefined}
            hoverText=" added since refresh"
          />
        </Box>
      </Box>
    </HStack>
  );
};

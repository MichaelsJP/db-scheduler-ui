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
import { AccordionPanel, Box, Divider, Text, VStack, Spinner } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import colors from 'src/styles/colors';
import { LogDataRow } from 'src/components/history/LogDataRow';
import { getLogMessages } from 'src/services/getLogMessages';
import { LogMessageModel } from 'src/models/LogMessageModel';

interface LogAccordionItemProps {
  taskData: object | null;
  stackTrace: string | null;
  taskName: string;
  taskInstance: string;
  executionTime: string;
}

export const LogAccordionItem: React.FC<LogAccordionItemProps> = ({
  stackTrace,
  taskData,
  taskName,
  taskInstance,
  executionTime,
}) => {
  const [messages, setMessages] = useState<LogMessageModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!taskName || !taskInstance || !executionTime) return;
    setLoading(true);
    getLogMessages(taskName, taskInstance, executionTime)
      .then((data) => {
        if (isMounted) setMessages(data);
      })
      .catch(() => {
        // Ignored to avoid console error
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [taskName, taskInstance, executionTime]);

  return (
    <AccordionPanel overflowX="auto" p={0}>
      <Box display={'flex'} justifyContent={'space-between'}></Box>
      <VStack
        align="start"
        spacing={2}
        bgColor={colors.primary['100']}
        p={0}
        w={'100%'}
        borderRadius={4}
      >
        {stackTrace && (
          <>
            <Text
              ml={'16px'}
              textDecoration={'underline'}
              color={colors.primary['500']}
            >
              Stacktrace
            </Text>
            <pre style={{ marginLeft: '16px', marginTop: '8px' }}>{stackTrace}</pre>
            <Divider color={colors.primary['300']} />
          </>
        )}

        {taskData && (
          <>
            <Text
              ml={'16px'}
              textDecoration={'underline'}
              color={colors.primary['500']}
            >
              Taskdata
            </Text>
            <LogDataRow taskData={taskData} />
            <Divider color={colors.primary['300']} />
          </>
        )}

        <Text
          ml={'16px'}
          textDecoration={'underline'}
          color={colors.primary['500']}
        >
          Execution Logs
        </Text>
        {loading ? (
          <Spinner ml={'16px'} my={'8px'} />
        ) : messages.length > 0 ? (
          <Box ml={'16px'} mb={'16px'} w="100%">
            {messages.map((msg, idx) => (
              <Text key={idx} fontSize="sm" fontFamily="monospace">
                <Text as="span" color="gray.500">[{new Date(msg.timeLogged).toISOString()}]</Text>{' '}
                <Text as="span" color={msg.logLevel === 'ERROR' ? 'red.500' : msg.logLevel === 'WARN' ? 'orange.500' : 'blue.500'} fontWeight="bold">
                  {msg.logLevel}
                </Text>{' '}
                - {msg.logMessage}
              </Text>
            ))}
          </Box>
        ) : (
          <Text ml={'16px'} mb={'16px'} fontSize="sm" color="gray.500">
            No execution logs found.
          </Text>
        )}

      </VStack>
    </AccordionPanel>
  );
};

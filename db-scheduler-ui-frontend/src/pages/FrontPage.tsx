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
import { Box, Flex, useDisclosure } from '@chakra-ui/react';
import { Route, Routes } from 'react-router-dom';
import { TopBar } from 'src/components/common/TopBar';
import { LogList } from 'src/components/history/LogList';
import { Sidebar } from 'src/components/layout/Sidebar';
import { MetricsPage } from 'src/pages/MetricsPage';
import { TimelinePage } from 'src/pages/TimelinePage';
import { TagDrawer } from 'src/components/tags/TagDrawer';
import TaskList from 'src/components/scheduled/TaskList';
import { getShowHistory } from 'src/utils/config';
import React, { useState } from 'react';

export const FrontPage: React.FC = () => {
  const showHistory = getShowHistory();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // TODO: Fetch real tags from backend
  const tags = ['etl', 'critical', 'cleanup', 'sync'];

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    onOpen();
  };

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      <TopBar title={'DB Scheduler UI'} />
      <Flex flex={1}>
        <Sidebar tags={tags} onTagClick={handleTagClick} />
        <Box flex={1} ml="240px" mt={14} px={10} overflowY="auto">
          <Routes>
            <Route index element={<TaskList />}></Route>
            <Route path="/:taskName" element={<TaskList />}></Route>
            <Route path="/:taskName/page/:page" element={<TaskList />}></Route>
            <Route
              path="/history/:taskName/:taskInstance"
              element={<LogList />}
            ></Route>
            {showHistory && (
              <Route path="/history/all" element={<LogList />}></Route>
            )}
            <Route path="/metrics" element={<MetricsPage />}></Route>
            <Route path="/timeline" element={<TimelinePage />}></Route>
          </Routes>
        </Box>
      </Flex>
      <TagDrawer tag={selectedTag} isOpen={isOpen} onClose={onClose} />
    </Box>
  );
};

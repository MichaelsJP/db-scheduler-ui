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
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  Heading,
} from '@chakra-ui/react';
import React from 'react';
import TaskList from 'src/components/scheduled/TaskList';

interface TagDrawerProps {
  tag: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TagDrawer: React.FC<TagDrawerProps> = ({ tag, isOpen, onClose }) => {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          Tag Focus: {tag}
        </DrawerHeader>

        <DrawerBody>
          <VStack align="stretch" spacing={6} mt={4}>
            <Heading size="sm">Tasks with tag: {tag}</Heading>
            {tag && <TaskList filterTags={[tag]} />}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

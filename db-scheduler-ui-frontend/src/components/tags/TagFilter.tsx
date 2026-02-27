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
import React from 'react';
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItemOption,
  MenuOptionGroup,
  HStack,
  Text,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useQuery } from '@tanstack/react-query';
import { getTags, ALL_TAGS_QUERY_KEY } from 'src/services/getTags';
import { TagBadge } from 'src/components/common/TagBadge';
import colors from 'src/styles/colors';

interface TagFilterProps {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  setSelectedTags,
}) => {
  const { data: allTags } = useQuery([ALL_TAGS_QUERY_KEY], getTags);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <VStack align="start" mt={4} ml={1} spacing={2} w="full">
      <HStack spacing={2} align="center">
        <Menu closeOnSelect={false}>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDownIcon />}
            size="sm"
            variant="outline"
            borderColor={colors.primary['300']}
            bg={colors.primary['100']}
            _hover={{ bg: colors.primary['200'] }}
          >
            Filter by Tags
          </MenuButton>
          <MenuList zIndex={10}>
            <MenuOptionGroup
              title="Tags"
              type="checkbox"
              value={selectedTags}
              onChange={(values) => setSelectedTags(values as string[])}
            >
              {allTags?.map((tag) => (
                <MenuItemOption key={tag} value={tag}>
                  {tag}
                </MenuItemOption>
              ))}
              {(!allTags || allTags.length === 0) && (
                <Box px={4} py={2}>
                  <Text fontSize="sm" color="gray.500">
                    No tags available
                  </Text>
                </Box>
              )}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
        {selectedTags.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setSelectedTags([])}
            colorScheme="red"
          >
            Clear all
          </Button>
        )}
      </HStack>
      <HStack wrap="wrap" spacing={2} mt={1}>
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            isSelected={true}
            onClick={handleTagToggle}
          />
        ))}
      </HStack>
    </VStack>
  );
};

import { VStack } from '@chakra-ui/react';

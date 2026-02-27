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
  VStack,
  Text,
  Link,
  Icon,
  HStack,
  Divider,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import React from 'react';
import { NavLink as RouterLink, useLocation } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { TagBadge } from 'src/components/common/TagBadge';
import colors from 'src/styles/colors';

const NavItem = ({
  icon,
  label,
  to,
  ...rest
}: {
  icon?: React.ElementType;
  label: string;
  to: string;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      as={RouterLink}
      to={to}
      w="full"
      _hover={{ textDecoration: 'none', bg: colors.primary['200'] }}
      bg={isActive ? colors.primary['200'] : 'transparent'}
      p={2}
      borderRadius="md"
      {...rest}
    >
      <HStack>
        {icon && <Icon as={icon} />}
        <Text fontWeight={isActive ? 'bold' : 'normal'}>{label}</Text>
      </HStack>
    </Link>
  );
};

export const Sidebar: React.FC<{ tags: string[]; onTagClick: (tag: string) => void }> = ({
  tags,
  onTagClick,
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

  return (
    <VStack
      w="240px"
      h="calc(100vh - 64px)"
      p={4}
      align="stretch"
      borderRight="1px solid"
      borderColor={colors.primary['300']}
      position="fixed"
      left={0}
      top="64px"
      overflowY="auto"
    >
      <VStack align="stretch" spacing={1}>
        <NavItem label="Overview" to="/" />
        <NavItem label="Metrics" to="/metrics" />
        <NavItem label="History" to="/history/all" />
        <NavItem label="Timeline" to="/timeline" />
      </VStack>

      <Divider my={4} />

      <Box>
        <HStack
          justify="space-between"
          cursor="pointer"
          onClick={onToggle}
          _hover={{ color: colors.dbBlue }}
        >
          <Text fontSize="xs" fontWeight="bold" letterSpacing="wider">
            TAGS
          </Text>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </HStack>
        <Collapse in={isOpen}>
          <VStack align="start" pl={2} pt={2} spacing={2}>
            {tags.length > 0 ? (
              tags.map((tag) => (
                <TagBadge key={tag} tag={tag} onClick={onTagClick} />
              ))
            ) : (
              <Text fontSize="xs" color="gray.500">
                No tags found
              </Text>
            )}
          </VStack>
        </Collapse>
      </Box>
    </VStack>
  );
};

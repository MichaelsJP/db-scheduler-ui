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
import { Badge, Tooltip } from '@chakra-ui/react';
import React from 'react';

interface TagBadgeProps {
  tag: string;
  onClick?: (tag: string) => void;
  isSelected?: boolean;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onClick, isSelected }) => {
  const getColor = (t: string) => {
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];
    const index = t.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <Tooltip label={`${isSelected ? 'Remove' : 'Add'} ${tag} filter`}>
      <Badge
        colorScheme={getColor(tag)}
        variant={isSelected ? 'solid' : 'subtle'}
        px={2}
        py={0.5}
        borderRadius="full"
        cursor={onClick ? 'pointer' : 'default'}
        onClick={() => onClick && onClick(tag)}
        textTransform="none"
        fontSize="xs"
        border={isSelected ? '1px solid' : 'none'}
        borderColor={isSelected ? 'whiteAlpha.500' : 'transparent'}
      >
        {tag}
      </Badge>
    </Tooltip>
  );
};

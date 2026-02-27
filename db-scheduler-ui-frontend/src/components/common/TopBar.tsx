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
import { Box, Button, HStack, Text } from '@chakra-ui/react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogoIcon } from 'src/assets/icons/Logo';
import colors from 'src/styles/colors';
import { getShowHistory } from 'src/utils/config';

interface TopBarProps {
  title: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showHistory = getShowHistory();

  const NavButton = ({ label, to, isActive }: { label: string; to: string; isActive: boolean }) => (
    <Button
      _hover={{
        bgColor: colors.primary['100'],
        borderColor: colors.dbBlue,
        color: colors.primary['400'],
      }}
      _active={{
        borderColor: colors.primary['200'],
        color: colors.primary['300'],
      }}
      bgColor={colors.primary['100']}
      color={colors.dbBlue}
      borderBottom="2px"
      borderRadius={'0'}
      borderColor={isActive ? colors.dbBlue : 'transparent'}
      onClick={() => navigate(to)}
      aria-label={`${label} button`}
      px={4}
      height="64px"
    >
      {label}
    </Button>
  );

  return (
    <Box
      backgroundColor={colors.primary['100']}
      display={'flex'}
      alignItems={'center'}
      gap={'8'}
      borderBottom="1px solid"
      borderColor={colors.primary['300']}
      px={4}
    >
      <Text
        as={'button'}
        onClick={() => navigate('/')}
        aria-label={'Logo home button'}
        color={colors.dbBlue}
        fontSize={'2xl'}
        p={4}
        fontWeight={'semibold'}
        display="flex"
        alignItems="center"
      >
        <LogoIcon mr={2} />
        {title}
      </Text>
      <HStack spacing={0} h="64px">
        <NavButton label="Scheduled" to="/" isActive={location.pathname === '/' || (!location.pathname.includes('/history') && !location.pathname.includes('/metrics') && !location.pathname.includes('/timeline'))} />
        <NavButton label="Overview" to="/metrics" isActive={location.pathname.includes('/metrics')} />
        {showHistory && (
          <NavButton label="History" to="/history/all" isActive={location.pathname.includes('/history')} />
        )}
        <NavButton label="Timeline" to="/timeline" isActive={location.pathname.includes('/timeline')} />
      </HStack>
    </Box>
  );
};

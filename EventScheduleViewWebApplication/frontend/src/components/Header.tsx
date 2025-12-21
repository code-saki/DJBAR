import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import LoginDropdown from './LoginDropdown';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userRef.current) return;
      if (!userRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  return (
    <Box as="header" borderBottom="1px solid #eee" px={4} py={3} bg="white">
      <Flex align="center" justify="space-between" maxW="1200px" mx="auto" gap={3}>
        {/* 左：ロゴ */}
        <Box fontWeight="bold" fontSize="xl" fontFamily="serif">
          <RouterLink to="/">
            <Flex align="center" gap={2}>
              <img src="/images/favicon.ico" alt="NLinA Logo" style={{ height: '30px' }} />
              <span>NLinA</span>
            </Flex>
          </RouterLink>
        </Box>

        {/* 中：ナビ */}
        <Flex gap={2} align="center">
          <RouterLink to="/events">
            <Button variant="ghost">EVENTS</Button>
          </RouterLink>
          <RouterLink to="/djs/1">
            <Button variant="ghost">DJ</Button>
          </RouterLink>
          <RouterLink to="/bars/1">
            <Button variant="ghost">BAR</Button>
          </RouterLink>
        </Flex>

        {/* 右：ログイン or ユーザーメニュー */}
        <Box>
          {!user ? (
            <LoginDropdown />
          ) : (
            <Box position="relative" ref={userRef}>
              <Button onClick={() => setMenuOpen((v) => !v)}>{user.name || user.email}</Button>
              {menuOpen && (
                <Box
                  position="absolute"
                  right={0}
                  mt={2}
                  bg="white"
                  border="1px solid #e5e7eb"
                  borderRadius="12px"
                  boxShadow="0 10px 30px rgba(0,0,0,0.12)"
                  minW="180px"
                  p={2}
                  zIndex={20}
                >
                  <Box px={3} py={2}>
                    <Text fontSize="sm" color="gray.600">
                      ログイン中
                    </Text>
                    <Text fontWeight="bold">{user.name || user.email}</Text>
                  </Box>
                  <Button
                    onClick={logout}
                    variant="ghost"
                    width="100%"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    ログアウト
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default Header;

import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Input,
  Text,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [display_name, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false); // ★ 表示/非表示トグル
  const [birthdate, setBirthdate] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    !loading && email.trim() !== '' && birthdate.trim() !== '' && password.length >= 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setLoading(true);
    try {
      // サブディレクトリ配信も想定して相対パス
      const res = await fetch('api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, display_name, password, birthdate }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {}
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await login(email, password);
      nav('/events');
    } catch (e: any) {
      setErr(e.message ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minH="100vh"
      bg="#fafafa"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Box bg="white" border="1px solid #eee" borderRadius="16px" p={6} w="100%" maxW="460px">
        <Heading as="h1" fontSize="xl" mb={4}>
          新規登録
        </Heading>

        <form onSubmit={onSubmit}>
          <Box mb={3}>
            <Text fontSize="sm" mb={1}>
              メールアドレス
            </Text>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
            />
          </Box>

          <Box mb={3}>
            <Text fontSize="sm" mb={1}>
              表示名（任意）
            </Text>
            <Input
              value={display_name}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              placeholder="任意"
            />
          </Box>

          <Box mb={3}>
            <Text fontSize="sm" mb={1}>
              生年月日
            </Text>
            <Input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.currentTarget.value)}
              required
              max={new Date().toISOString().slice(0, 10)} // 未来日防止
            />
          </Box>

          <Box mb={4}>
            <Text fontSize="sm" mb={1}>
              パスワード
            </Text>
            <InputGroup>
              <Input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8文字以上"
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPw ? 'パスワードを非表示' : 'パスワードを表示'}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPw((v) => !v)}
                  icon={showPw ? <ViewOffIcon /> : <ViewIcon />}
                />
              </InputRightElement>
            </InputGroup>
          </Box>

          {err && (
            <Text color="red.500" fontSize="sm" mb={3}>
              {err}
            </Text>
          )}

          <Button type="submit" colorScheme="teal" width="100%" disabled={!canSubmit}>
            {loading ? '送信中...' : '登録する'}
          </Button>
        </form>

        <Box mt={4} textAlign="center">
          <a href="/events" style={{ color: '#0d9488' }}>
            ← 一覧へ戻る
          </a>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;

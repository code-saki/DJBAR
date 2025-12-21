import { useEffect, useState } from 'react';
import { Box, Heading, Text, Image, SimpleGrid } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import RegisterButton from '../components/RegisterButton';

// APIの返却ズレに強い、ゆるい型
type EventLike = {
  id: number;
  title?: string;
  date?: string;
  detail?: string;
  bar?: { id?: number; name?: string } | null;
  bar_id?: number;
  bar_name?: string;
  djs?: Array<
    | { id?: number; name?: string }
    | { dj?: { id?: number; name?: string } }
    | { djId?: number; dj_name?: string }
  >;
};

const EventList = () => {
  const [events, setEvents] = useState<EventLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/events', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message ?? 'failed to fetch');
        console.error('API Error (/api/events):', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box minH="100vh" p={8}>
        <Text>読み込み中...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" p={8} color="red.500">
        <Heading size="md" mb={2}>
          データ取得に失敗しました
        </Heading>
        <Text>{error}</Text>
        <Text mt={2} fontSize="sm" color="gray.600">
          （例：/public_html/.htaccess、/public_html/api/.htaccess、/api 側の PHP エラー、fetch
          のパスなど）
        </Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      py={12}
      backgroundSize="cover"
      backgroundRepeat="no-repeat"
      backgroundAttachment="fixed"
      backgroundPosition="center"
    >
      <Heading
        as="h1"
        fontSize={['2xl', '4xl']}
        fontWeight="bold"
        letterSpacing="wide"
        mb={10}
        color="black"
        textAlign="center"
        fontFamily="serif"
      >
        night life in asakusa
      </Heading>

      <Box textAlign="center" mb={8}>
        <RegisterButton />
      </Box>

      {events.length === 0 ? (
        <Box textAlign="center" color="gray.600">
          イベントがありません。
        </Box>
      ) : (
        <SimpleGrid
          columns={{ base: 1, md: 2, lg: 3 }}
          gap={10}
          px={{ base: 2, md: 6, lg: 16 }}
          color={'black'}
        >
          {events.map((ev) => {
            const id = ev.id;
            const title = ev.title ?? '（タイトル未設定）';
            const dateStr = ev.date ? new Date(ev.date).toLocaleString() : '';
            const barId = ev.bar?.id ?? ev.bar_id ?? '';
            const barName = ev.bar?.name ?? ev.bar_name ?? '（会場不明）';

            const djNames = Array.isArray(ev.djs)
              ? ev.djs
                  .map((d: any) => d?.name ?? d?.dj?.name ?? d?.dj_name ?? null)
                  .filter(Boolean)
                  .join(', ')
              : '';

            return (
              <Box
                key={id}
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="lg"
                transition="all 0.2s"
                _hover={{ boxShadow: '2xl', transform: 'translateY(-4px) scale(1.03)' }}
              >
                <Image
                  src="/images/sample_event1.jpg"
                  alt="イベント画像"
                  objectFit="cover"
                  w="100%"
                  h="220px"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                />
                <Box p={5} color={'black'}>
                  <Heading fontSize="xl" mb={2} fontFamily="serif">
                    <Link to={`/events/${id}`}>{title}</Link>
                  </Heading>

                  {dateStr && (
                    <Text fontSize="sm" color="gray.500">
                      {dateStr}
                    </Text>
                  )}

                  <Text fontWeight="bold" mt={2}>
                    {barId ? <Link to={`/bars/${barId}`}>{barName}</Link> : barName}
                  </Text>

                  {djNames && (
                    <Text mt={1} fontSize="sm" color="gray.600">
                      出演DJ: {djNames}
                    </Text>
                  )}

                  {ev.detail && (
                    <Text lineClamp={2 as any} mt={2}>
                      {ev.detail}
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default EventList;

import { useEffect, useState } from 'react';
import { Box, Heading, Text, Image, SimpleGrid } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { fetchJson } from '../lib/api';

type Bar = {
  id: number;
  name: string;
};

type Event = {
  id: number;
  title: string;
  date: string; // ISO文字列前提
  imageUrl?: string | null; // 画像が無いこともあるので任意
  bar?: Bar; // API によっては undefined のこともある
};

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<Event[]>('/events')
      .then((data) => setEvents(data.slice(0, 6)))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <Box minH="100vh" py={12}>
      <Heading
        as="h1"
        fontSize={['2xl', '4xl']}
        fontWeight="bold"
        letterSpacing="wide"
        mb={10}
        color="black"
        textAlign="center"
        fontFamily="serif"
      ></Heading>

      {err && (
        <Box color="red.500" textAlign="center" mb={6}>
          Error: {err}
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} lineClamp={8} px={{ base: 2, md: 4, lg: 16 }}>
        {events.map((event) => (
          <Box
            key={event.id}
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="lg"
            transition="all 0.2s"
            _hover={{ boxShadow: '2xl', transform: 'translateY(-4px) scale(1.03)' }}
          >
            <Image
              src={event.imageUrl || '/sample_event1.jpg'}
              alt={event.title}
              objectFit="cover"
              w="100%"
              h="220px"
            />
            <Box p={5}>
              <Heading fontSize="xl" mb={2} fontFamily="serif">
                <Link to={`/events/${event.id}`}>{event.title}</Link>
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {new Date(event.date).toLocaleString()}
              </Text>
              <Text fontWeight="bold" mt={2}>
                <Link to={`/bars/${event.bar?.id ?? ''}`}>{event.bar?.name ?? '会場未設定'}</Link>
              </Text>
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

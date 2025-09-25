import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Tinnitus Therapy' }} />
      <Stack.Screen name="frequency-finder" options={{ title: 'Frequency Finder' }} />
      <Stack.Screen name="playlists" options={{ title: 'Playlists' }} />
    </Stack>
  );
}
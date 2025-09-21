import { Stack } from 'expo-router';

export default function AreaSuperAdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="issues" />
      <Stack.Screen name="issue-[id]" />
      <Stack.Screen name="departments" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
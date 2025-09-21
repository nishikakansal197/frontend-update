import { Stack } from 'expo-router';

export default function DepartmentAdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="issues" />
      <Stack.Screen name="issue-[id]" />
      <Stack.Screen name="tender" />
      <Stack.Screen name="contractors" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
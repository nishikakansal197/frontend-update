import { Stack } from 'expo-router';

export default function AdminLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="dashboard" />
			<Stack.Screen name="issues" />
			<Stack.Screen name="issue-[id]" />
			<Stack.Screen name="users" />
			<Stack.Screen name="analytics" />
			<Stack.Screen name="feedback-management" />
			<Stack.Screen name="municipal-contacts" />
			<Stack.Screen name="settings" />
		</Stack>
	);
} 
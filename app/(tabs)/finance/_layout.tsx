import { Stack } from 'expo-router';

export default function FinanceLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Finance' }} />
      <Stack.Screen name="investments" options={{ title: 'Investments' }} />
      <Stack.Screen name="investment-add" options={{ title: 'Add Investment', presentation: 'modal' }} />
      <Stack.Screen name="loans" options={{ title: 'Loans' }} />
      <Stack.Screen name="loan-add" options={{ title: 'Add Loan', presentation: 'modal' }} />
      <Stack.Screen name="loan-detail" options={{ title: 'Loan Detail' }} />
      <Stack.Screen name="settlements" options={{ title: 'Settlements' }} />
      <Stack.Screen name="settlement-detail" options={{ title: 'Settlement' }} />
      <Stack.Screen name="reports" options={{ title: 'Reports' }} />
    </Stack>
  );
}
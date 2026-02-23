import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { LoginScreen } from './src/screens/LoginScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { ProjectsScreen } from './src/screens/ProjectsScreen'
import { DailyReportScreen } from './src/screens/DailyReportScreen'
import { DispatchListScreen } from './src/screens/DispatchListScreen'
import { DispatchDetailScreen } from './src/screens/DispatchDetailScreen'
import { QCProjectsScreen } from './src/screens/QCProjectsScreen'
import { QCItemsScreen } from './src/screens/QCItemsScreen'
import { QCItemScreen } from './src/screens/QCItemScreen'
import { SuccessScreen } from './src/screens/SuccessScreen'

export type RootStackParamList = {
  Login: undefined
  Home: { role: string; name: string }
  // Site staff
  Projects: undefined
  DailyReport: { projectId: string; projectName: string }
  // Driver
  DispatchList: undefined
  DispatchDetail: { dispatchId: string; dispatchNumber: string }
  // QS
  QCProjects: undefined
  QCItems: { projectId: string; projectName: string; projectCode: string }
  QCItem: { itemId: string; itemCode: string; description: string; projectId: string }
  // Shared
  Success: { message?: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const HEADER = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18 },
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={HEADER}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerBackVisible: false, title: 'C5 Site' }} />
        {/* Site staff */}
        <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: 'My Projects' }} />
        <Stack.Screen name="DailyReport" component={DailyReportScreen} options={{ title: 'Daily Report' }} />
        {/* Driver */}
        <Stack.Screen name="DispatchList" component={DispatchListScreen} options={{ title: 'My Deliveries' }} />
        <Stack.Screen name="DispatchDetail" component={DispatchDetailScreen} options={{ title: 'Delivery' }} />
        {/* QS */}
        <Stack.Screen name="QCProjects" component={QCProjectsScreen} options={{ title: 'Site QC' }} />
        <Stack.Screen name="QCItems" component={QCItemsScreen} options={{ title: 'Items to QC' }} />
        <Stack.Screen name="QCItem" component={QCItemScreen} options={{ title: 'QC Item' }} />
        {/* Shared */}
        <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

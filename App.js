// AI-assisted: see docs/AI_LOG.md #2
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { DriverProvider } from './src/context/DriverContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <DriverProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </DriverProvider>
  );
}

// AI-assisted: see docs/AI_LOG.md #2, #15
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { DriverProvider } from './src/context/DriverContext';
import { LanguageProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <LanguageProvider>
      <DriverProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </DriverProvider>
    </LanguageProvider>
  );
}
